import type { Entity, Layer, Scene } from "../../core/scene.ts";
import type { Renderer, RendererController } from "../../core/renderer.ts";
import {
  SVG_NS,
  applyAnimation,
  buildCell,
  buildVoxelCell,
  centroid,
  periodLimitFor,
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

function mountSvg(container: HTMLElement, initial: Scene): RendererController {
  let scene = initial;
  let mounted = true;
  let paused = false;
  let rafHandle: number | null = null;
  let entities: EntityRuntime[] = [];

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("shape-rendering", "crispEdges");
  // The wrapper carries perspective so child rotate3d() actually shows depth.
  svg.style.perspective = "1400px";
  svg.style.transformStyle = "preserve-3d";
  container.appendChild(svg);

  build();
  start();

  function build(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    entities = [];

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
      if (built.animated) entities.push(built.animated);
    }
  }

  function buildEntity(
    entity: Entity,
    cellSize: number,
  ): { group: SVGGElement; animated: EntityRuntime | null } {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "tessera-entity");
    group.setAttribute("id", `tessera-entity-${entity.id}`);

    const tx = entity.position.x * cellSize;
    const ty = entity.position.y * cellSize;
    const pivot = entity.shape.pivot ?? centroid(entity.shape.cells);
    const px = pivot.x * cellSize;
    const py = pivot.y * cellSize;

    // The transform composes as:
    //   translate(tx+px, ty+py)  rotate(...)  translate(-px, -py)
    //
    // Read inside-out: shift entity-local coords by -pivot, rotate around the
    // origin, then translate the rotated pivot to its target viewBox point.
    // The pivot is the only point that survives unchanged through rotation.
    //
    // transform-origin must be "0 0" — any non-zero origin re-introduces the
    // double-translate bug that plagued earlier versions.
    const pivotedTranslate = `translate(${tx + px}px, ${ty + py}px)`;
    const cellOffset = px !== 0 || py !== 0 ? ` translate(${-px}px, ${-py}px)` : "";
    const baseTransform = `${pivotedTranslate}${cellOffset}`;

    group.style.transform = baseTransform;
    group.style.transformOrigin = "0 0";
    group.style.transformBox = "view-box";

    for (const cell of entity.shape.cells) {
      group.appendChild(buildVoxelCell(cell, cellSize));
    }

    if (!entity.animation) return { group, animated: null };

    const animated: EntityRuntime = {
      group,
      pivotedTranslate,
      cellOffset,
      baseTransform,
      animation: entity.animation,
      startedAt: 0,
      periodLimit: periodLimitFor(entity.animation),
    };
    return { group, animated };
  }

  function tick(now: number): void {
    rafHandle = null;
    if (!mounted || paused) return;

    let anyAlive = false;
    for (const e of entities) {
      if (e.startedAt === 0) e.startedAt = now;
      const elapsed = now - e.startedAt;

      if (e.periodLimit !== null && elapsed / e.animation.durationMs >= e.periodLimit) {
        e.group.style.transform = e.baseTransform;
        continue;
      }
      anyAlive = true;
      applyAnimation(e, elapsed);
    }

    // Once every entity has finished its repeat count, let the loop go dormant
    // rather than churning RAF callbacks. setScene/resume restart it.
    if (anyAlive) rafHandle = requestAnimationFrame(tick);
  }

  function start(): void {
    if (rafHandle !== null || paused || !mounted) return;
    if (entities.length === 0) return;
    for (const e of entities) e.startedAt = 0;
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
    dispose(): void {
      if (!mounted) return;
      mounted = false;
      stop();
      if (svg.parentNode === container) container.removeChild(svg);
      entities = [];
    },
  };
}
