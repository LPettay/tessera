import type { Entity, Layer, Scene } from "../../core/scene.ts";
import type {
  FrameCallback,
  FrameContext,
  Renderer,
  RendererController,
} from "../../core/renderer.ts";
import { rasterizeText } from "../../core/text.ts";
import {
  SVG_NS,
  applyAnimation,
  applyNeutral,
  buildCell,
  buildVoxelCell,
  centroid,
  isPeriodComplete,
  periodLimitFor,
  rasterizeLine,
  rasterizeWedge,
  unionPixelSize,
} from "./svg-helpers.ts";
import type { EntityRuntime } from "./svg-helpers.ts";

/**
 * Tier 1 — SVG renderer (v0.1).
 *
 * Vanilla DOM + requestAnimationFrame. No framer-motion, no motion-one.
 * Rationale and v0.1 capability ceiling: ADR 0009.
 */
export const svgRenderer: Renderer = {
  capabilities: {
    tier: "svg",
    maxCellsPerLayer: 500,
    particles: false,
  },
  mount(container: HTMLElement, scene: Scene): RendererController {
    return mountSvg(container, scene);
  },
};

/**
 * Per-entity reference for the L4 offset layer (ADR 0024). Captures
 * everything we need to apply (or revert) a per-frame translation
 * regardless of whether the entity also has a declared `Animation`.
 */
type EntityRef = {
  group: SVGGElement;
  baseTransform: string;
  cellSize: number;
  /** True if this entity is in the `entities[]` runtime list, so its
   *  transform is rewritten every animated tick. False for static
   *  entities — we have to manage their transform ourselves. */
  animated: boolean;
};

function mountSvg(container: HTMLElement, initial: Scene): RendererController {
  let scene = initial;
  let mounted = true;
  let paused = false;
  let rafHandle: number | null = null;
  let entities: EntityRuntime[] = [];

  // L4 — onFrame interactivity (ADR 0024).
  const entityRefs = new Map<string, EntityRef>();
  const frameCallbacks: FrameCallback[] = [];
  let currentOffsets = new Map<string, { dx: number; dy: number }>();
  let previousOffsets = new Map<string, { dx: number; dy: number }>();
  let cursor: { x: number; y: number } | null = null;
  let sceneStartedAt = 0;
  let lastFrameTime = 0;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("shape-rendering", "crispEdges");
  // The wrapper carries perspective so child rotate3d() actually shows depth.
  svg.style.perspective = "1400px";
  svg.style.transformStyle = "preserve-3d";
  container.appendChild(svg);

  // Native cursor tracking. Convert clientX/Y to viewBox space via the
  // SVG's screen CTM — handles preserveAspectRatio and CSS scaling
  // correctly without us hand-rolling the math.
  function onPointerMove(e: PointerEvent): void {
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    cursor = { x: local.x, y: local.y };
  }
  function onPointerLeave(): void {
    cursor = null;
  }
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerleave", onPointerLeave);

  build();
  start();

  function build(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    entities = [];
    entityRefs.clear();
    currentOffsets = new Map();
    previousOffsets = new Map();
    sceneStartedAt = 0;
    lastFrameTime = 0;

    const visible = scene.layers.filter((l) => l.visible);
    const { width, height } = unionPixelSize(visible);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));

    const ordered = visible.slice().sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of ordered) buildLayer(layer);
  }

  function buildLayer(layer: Layer): void {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "tessera-layer");
    g.setAttribute("id", `tessera-layer-${layer.id}`);
    g.setAttribute("opacity", String(layer.opacity));
    svg.appendChild(g);

    if (layer.cells) {
      for (const cell of layer.cells) g.appendChild(buildCell(cell, layer.cellSize));
    }
    for (const entity of layer.entities) {
      const built = buildEntity(entity, layer.cellSize);
      g.appendChild(built.group);
      entityRefs.set(`${layer.id}:${entity.id}`, {
        group: built.group,
        baseTransform: built.baseTransform,
        cellSize: layer.cellSize,
        animated: built.animated !== null,
      });
      if (built.animated) entities.push(built.animated);
    }
  }

  function buildEntity(
    entity: Entity,
    cellSize: number,
  ): { group: SVGGElement; animated: EntityRuntime | null; baseTransform: string } {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "tessera-entity");
    group.setAttribute("id", `tessera-entity-${entity.id}`);

    if (entity.shape.kind === "vector") {
      return buildVectorEntity(group, entity, cellSize);
    }
    if (entity.shape.kind === "text") {
      // Text rasterizes once into voxel-sprite cells (ADR 0018) — animation
      // and rendering paths are then identical to a hand-authored sprite.
      const cells = rasterizeText(entity.shape);
      const synthetic: Entity = {
        ...entity,
        shape: { kind: "voxel-sprite", cells, pivot: { x: 0, y: 0 } },
      };
      return buildVoxelEntity(group, synthetic, cellSize);
    }
    return buildVoxelEntity(group, entity, cellSize);
  }

  function buildVoxelEntity(
    group: SVGGElement,
    entity: Entity,
    cellSize: number,
  ): { group: SVGGElement; animated: EntityRuntime | null; baseTransform: string } {
    if (entity.shape.kind !== "voxel-sprite") {
      throw new Error("buildVoxelEntity: expected voxel-sprite shape");
    }

    const tx = entity.position.x * cellSize;
    const ty = entity.position.y * cellSize;
    const pivot = entity.shape.pivot ?? centroid(entity.shape.cells);
    const px = pivot.x * cellSize;
    const py = pivot.y * cellSize;

    // Transform composes as:
    //   translate(tx+px, ty+py)  rotate(...)  translate(-px, -py)
    // Read inside-out: shift entity-local coords by -pivot, rotate around
    // the origin, then translate the rotated pivot to its target viewBox
    // point. transform-origin must be "0 0" — non-zero re-introduces the
    // double-translate bug. See the v0.1 fix-transform-origin PR.
    const pivotedTranslate = `translate(${tx + px}px, ${ty + py}px)`;
    const cellOffset = px !== 0 || py !== 0 ? ` translate(${-px}px, ${-py}px)` : "";
    const baseTransform = `${pivotedTranslate}${cellOffset}`;

    group.style.transform = baseTransform;
    group.style.transformOrigin = "0 0";
    group.style.transformBox = "view-box";

    for (const cell of entity.shape.cells) {
      group.appendChild(buildVoxelCell(cell, cellSize));
    }

    if (!entity.animation) return { group, animated: null, baseTransform };

    const animated: EntityRuntime = {
      kind: "voxel",
      group,
      pivotedTranslate,
      cellOffset,
      baseTransform,
      cellSize,
      animation: entity.animation,
      startedAt: 0,
      periodLimit: periodLimitFor(entity.animation),
    };
    return { group, animated, baseTransform };
  }

  function buildVectorEntity(
    group: SVGGElement,
    entity: Entity,
    cellSize: number,
  ): { group: SVGGElement; animated: EntityRuntime | null; baseTransform: string } {
    if (entity.shape.kind !== "vector") {
      throw new Error("buildVectorEntity: expected vector shape");
    }

    const tx = entity.position.x * cellSize;
    const ty = entity.position.y * cellSize;
    const baseTransform = `translate(${tx}px, ${ty}px)`;
    group.style.transform = baseTransform;
    group.style.transformOrigin = "0 0";
    group.style.transformBox = "view-box";

    const pivot = entity.shape.pivot ?? { x: 0, y: 0 };

    // Seed the entity with its angle-0 rasterization so the first paint
    // is correct even before the animation loop starts.
    const initial = new Map<string, { x: number; y: number; fill: string }>();
    for (const seg of entity.shape.segments) {
      if (seg.kind === "line") {
        rasterizeLine(seg.from, seg.to, seg.thickness, seg.fill, initial);
      } else {
        rasterizeWedge(seg.apex, seg.baseCenter, seg.baseWidth, seg.fill, initial);
      }
    }
    for (const cell of initial.values()) {
      group.appendChild(buildCell(cell, cellSize));
    }

    if (!entity.animation) return { group, animated: null, baseTransform };

    const animated: EntityRuntime = {
      kind: "vector",
      group,
      segments: entity.shape.segments,
      pivot,
      cellSize,
      baseTransform,
      animation: entity.animation,
      startedAt: 0,
      periodLimit: periodLimitFor(entity.animation),
    };
    return { group, animated, baseTransform };
  }

  function setOffset(layerId: string, entityId: string, dx: number, dy: number): void {
    const key = `${layerId}:${entityId}`;
    if (!entityRefs.has(key)) return;
    currentOffsets.set(key, { dx, dy });
  }

  function tick(now: number): void {
    rafHandle = null;
    if (!mounted || paused) return;

    if (sceneStartedAt === 0) sceneStartedAt = now;
    const dt = lastFrameTime === 0 ? 0 : now - lastFrameTime;
    lastFrameTime = now;

    // Phase 1 — run user callbacks. They populate `currentOffsets` via
    // setOffset for any entity they want displaced this frame.
    previousOffsets = currentOffsets;
    currentOffsets = new Map();
    if (frameCallbacks.length > 0) {
      const ctx: FrameContext = {
        elapsed: now - sceneStartedAt,
        dt,
        cursor,
        setOffset,
      };
      for (const cb of frameCallbacks) cb(ctx);
    }

    // Phase 2 — apply declared animations. Each entity writes its full
    // baseTransform + animation transform; offsets are layered after.
    let anyAlive = false;
    for (const e of entities) {
      if (e.startedAt === 0) e.startedAt = now;
      const elapsed = now - e.startedAt;

      if (e.periodLimit !== null && isPeriodComplete(e.animation, elapsed, e.periodLimit)) {
        applyNeutral(e);
        continue;
      }
      anyAlive = true;
      applyAnimation(e, elapsed);
    }

    // Phase 3 — apply per-frame offsets. Animated entities had their
    // transform rewritten in Phase 2 (or settled by applyNeutral); we
    // append the offset translate. Static entities keep their
    // baseTransform unless an offset is active.
    //
    // Reset transforms for entities that had an offset last frame but
    // not this one — applies only to static entities, since animated
    // ones are already re-set every tick by Phase 2.
    for (const key of previousOffsets.keys()) {
      if (currentOffsets.has(key)) continue;
      const ref = entityRefs.get(key);
      if (ref && !ref.animated) {
        ref.group.style.transform = ref.baseTransform;
      }
    }
    for (const [key, offset] of currentOffsets) {
      const ref = entityRefs.get(key);
      if (!ref) continue;
      const px = offset.dx * ref.cellSize;
      const py = offset.dy * ref.cellSize;
      const baseT = ref.animated ? ref.group.style.transform : ref.baseTransform;
      ref.group.style.transform = `${baseT} translate(${px}px, ${py}px)`;
    }

    // Keep the loop alive while any animation is running OR any callback
    // is registered. A static scene with cursor reactivity has zero
    // animated entities but must still tick to read cursor + run
    // callbacks; without this, the cursor field would freeze after the
    // first frame.
    if (anyAlive || frameCallbacks.length > 0) {
      rafHandle = requestAnimationFrame(tick);
    }
  }

  function start(): void {
    if (rafHandle !== null || paused || !mounted) return;
    if (entities.length === 0 && frameCallbacks.length === 0) return;
    for (const e of entities) e.startedAt = 0;
    sceneStartedAt = 0;
    lastFrameTime = 0;
    rafHandle = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  return {
    get mounted() {
      return mounted;
    },
    get paused() {
      return paused;
    },
    pause(): void {
      if (!mounted || paused) return;
      paused = true;
      stop();
    },
    resume(): void {
      if (!mounted || !paused) return;
      paused = false;
      start();
    },
    setScene(next: Scene): void {
      if (!mounted) return;
      stop();
      scene = next;
      build();
      if (!paused) start();
    },
    onFrame(callback: FrameCallback): () => void {
      if (!mounted) return () => {};
      frameCallbacks.push(callback);
      // Re-arm the loop in case it was dormant (no animated entities).
      start();
      return () => {
        const idx = frameCallbacks.indexOf(callback);
        if (idx >= 0) frameCallbacks.splice(idx, 1);
      };
    },
    setCursor(next: { x: number; y: number } | null): void {
      if (!mounted) return;
      cursor = next;
    },
    dispose(): void {
      if (!mounted) return;
      mounted = false;
      stop();
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerleave", onPointerLeave);
      if (svg.parentNode === container) container.removeChild(svg);
      entities = [];
      entityRefs.clear();
      frameCallbacks.length = 0;
    },
  };
}
