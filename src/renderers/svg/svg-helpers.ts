import type {
  Animation,
  BobAnimation,
  Cell,
  DriftAnimation,
  FadeAnimation,
  Layer,
  OscillateAnimation,
  PulseAnimation,
  SpinAnimation,
  VectorSegment,
  VoxelSpriteCell,
} from "../../core/scene.ts";

/**
 * Pure helpers for the SVG renderer. Split out so svg-renderer.ts can stay
 * focused on the controller lifecycle and stay under the per-file size budget.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Per-entity runtime state. Discriminated by `kind`:
 *
 *  - `voxel`  — the existing path. Cells are static; CSS transforms on the
 *               group apply the animation each frame. At non-cardinal
 *               rotation angles, individual cells become tilted parallelograms
 *               (intentional for small Y-oscillation; visually wrong for
 *               in-plane spin).
 *  - `vector` — segments are rotated in cell-space each frame, then
 *               rasterized into axis-aligned cells which are written back
 *               into the entity's `<g>`. Pixels stay locked to the grid;
 *               the shape's *position* rotates instead of the cells. ADR 0014.
 */
export type EntityRuntime = VoxelEntityRuntime | VectorEntityRuntime;

export type VoxelEntityRuntime = {
  kind: "voxel";
  group: SVGGElement;
  pivotedTranslate: string;
  cellOffset: string;
  baseTransform: string;
  /** Pixel size of one cell — needed by bob/drift to convert cell amplitude/velocity to px. */
  cellSize: number;
  animation: Animation;
  startedAt: number;
  periodLimit: number | null;
};

export type VectorEntityRuntime = {
  kind: "vector";
  group: SVGGElement;
  /** Source segments in entity-local cell coordinates, never mutated. */
  segments: VectorSegment[];
  /** Entity-local pivot for rotation. */
  pivot: { x: number; y: number };
  /** Pixel size of one cell in the parent layer. */
  cellSize: number;
  /**
   * Base CSS transform applied at build time (entity translate). Non-rotation
   * animations layer on top of this string; rotation animations don't touch it
   * (they rasterize per frame instead).
   */
  baseTransform: string;
  animation: Animation;
  startedAt: number;
  periodLimit: number | null;
};

export function buildCell(cell: Cell, cellSize: number): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(cell.x * cellSize));
  rect.setAttribute("y", String(cell.y * cellSize));
  rect.setAttribute("width", String(cellSize));
  rect.setAttribute("height", String(cellSize));
  rect.setAttribute("fill", cell.fill);
  return rect;
}

export function buildVoxelCell(cell: VoxelSpriteCell, cellSize: number): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, "rect");
  const w = cell.w ?? 1;
  const h = cell.h ?? 1;
  rect.setAttribute("x", String(cell.x * cellSize));
  rect.setAttribute("y", String(cell.y * cellSize));
  rect.setAttribute("width", String(w * cellSize));
  rect.setAttribute("height", String(h * cellSize));
  rect.setAttribute("fill", cell.fill);
  return rect;
}

export function applyAnimation(e: EntityRuntime, elapsed: number): void {
  if (e.kind === "voxel") {
    applyVoxelAnimation(e, elapsed);
  } else {
    applyVectorAnimation(e, elapsed);
  }
}

function applyVoxelAnimation(e: VoxelEntityRuntime, elapsed: number): void {
  switch (e.animation.kind) {
    case "oscillate":
      applyOscillate(e, elapsed, e.animation);
      return;
    case "spin":
      applySpin(e, elapsed, e.animation);
      return;
    case "pulse":
      applyPulse(e.group, e.baseTransform, e.animation, elapsed);
      return;
    case "bob":
      applyBob(e.group, e.baseTransform, e.animation, elapsed, e.cellSize);
      return;
    case "fade":
      applyFade(e.group, e.animation, elapsed);
      return;
    case "drift":
      applyDrift(e.group, e.baseTransform, e.animation, elapsed, e.cellSize);
      return;
  }
}

function applyOscillate(e: VoxelEntityRuntime, elapsed: number, anim: OscillateAnimation): void {
  // x and z are reserved at the type level; v0.1 SVG only animates y.
  if (anim.axis !== "y") {
    e.group.style.transform = e.baseTransform;
    return;
  }
  const angle = anim.degrees * Math.sin((2 * Math.PI * elapsed) / anim.durationMs);
  e.group.style.transform = `${e.pivotedTranslate} rotate3d(0, 1, 0, ${angle}deg)${e.cellOffset}`;
}

function applySpin(e: VoxelEntityRuntime, elapsed: number, anim: SpinAnimation): void {
  // x and y are reserved at the type level; v0.1 SVG only animates z (in-plane rotation).
  if (anim.axis !== "z") {
    e.group.style.transform = e.baseTransform;
    return;
  }
  const sign = anim.direction === "ccw" ? -1 : 1;
  const angle = sign * 360 * (elapsed / anim.durationMs);
  e.group.style.transform = `${e.pivotedTranslate} rotate(${angle}deg)${e.cellOffset}`;
}

/**
 * Sine-eased progress in [0, 1] over a single period — `0.5 * (1 - cos(...))`.
 * t=0 → 0, t=T/2 → 1, t=T → 0. Shared by pulse/bob/fade.
 */
function sineProgress(elapsed: number, durationMs: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * elapsed) / durationMs));
}

function applyPulse(
  group: SVGGElement,
  baseTransform: string,
  anim: PulseAnimation,
  elapsed: number,
): void {
  const s = anim.from + (anim.to - anim.from) * sineProgress(elapsed, anim.durationMs);
  group.style.transform = `${baseTransform} scale(${s})`;
}

function applyBob(
  group: SVGGElement,
  baseTransform: string,
  anim: BobAnimation,
  elapsed: number,
  cellSize: number,
): void {
  // True back-and-forth (-amp..+amp), so use sin (not the [0,1] sineProgress helper).
  const cells = anim.amplitude * Math.sin((2 * Math.PI * elapsed) / anim.durationMs);
  const px = cells * cellSize;
  group.style.transform = `${baseTransform} translateY(${px}px)`;
}

function applyFade(group: SVGGElement, anim: FadeAnimation, elapsed: number): void {
  const o = anim.from + (anim.to - anim.from) * sineProgress(elapsed, anim.durationMs);
  group.style.opacity = String(o);
}

function applyDrift(
  group: SVGGElement,
  baseTransform: string,
  anim: DriftAnimation,
  elapsed: number,
  cellSize: number,
): void {
  const seconds = elapsed / 1000;
  const dx = anim.velocity.x * seconds * cellSize;
  const dy = anim.velocity.y * seconds * cellSize;
  group.style.transform = `${baseTransform} translate(${dx}px, ${dy}px)`;
}

function applyVectorAnimation(e: VectorEntityRuntime, elapsed: number): void {
  // Rotation kinds rasterize per-frame (segments rotated → cells stamped).
  // Non-rotation kinds (pulse/bob/fade/drift) leave the rasterized cells
  // alone and apply CSS transform/opacity to the group instead — much
  // cheaper, and visually equivalent for scale/translate/opacity.
  switch (e.animation.kind) {
    case "oscillate":
    case "spin": {
      const angleRad = currentAngleRad(e.animation, elapsed);
      rasterizeAndPaint(e, angleRad);
      return;
    }
    case "pulse":
      applyPulse(e.group, e.baseTransform, e.animation, elapsed);
      return;
    case "bob":
      applyBob(e.group, e.baseTransform, e.animation, elapsed, e.cellSize);
      return;
    case "fade":
      applyFade(e.group, e.animation, elapsed);
      return;
    case "drift":
      applyDrift(e.group, e.baseTransform, e.animation, elapsed, e.cellSize);
      return;
  }
}

/**
 * Settle an entity into its rest state once its animation's period limit
 * expires. Each kind has a natural rest:
 *   - rotation kinds (oscillate/spin): no rotation. Voxel resets transform;
 *     vector re-rasterizes at angle 0.
 *   - pulse/bob/drift: drop the layered transform back to baseTransform.
 *   - fade: settle to `from` (one full period returns to `from` anyway).
 */
export function applyNeutral(e: EntityRuntime): void {
  switch (e.animation.kind) {
    case "oscillate":
    case "spin":
      if (e.kind === "voxel") {
        e.group.style.transform = e.baseTransform;
      } else {
        rasterizeAndPaint(e, 0);
      }
      return;
    case "pulse":
    case "bob":
    case "drift":
      e.group.style.transform = e.baseTransform;
      return;
    case "fade":
      e.group.style.opacity = String(e.animation.from);
      return;
  }
}

/**
 * Current rotation angle in radians, given an animation and elapsed time.
 * Only oscillate/spin contribute rotation; non-rotation kinds return 0
 * (the caller routes them through CSS transforms instead of rasterization).
 */
function currentAngleRad(animation: OscillateAnimation | SpinAnimation, elapsed: number): number {
  if (animation.kind === "oscillate") {
    // x and z reserved; for vector entities, only z matters (in-plane).
    if (animation.axis !== "z") return 0;
    const deg = animation.degrees * Math.sin((2 * Math.PI * elapsed) / animation.durationMs);
    return (deg * Math.PI) / 180;
  }
  // spin
  if (animation.axis !== "z") return 0;
  const sign = animation.direction === "ccw" ? -1 : 1;
  const deg = sign * 360 * (elapsed / animation.durationMs);
  return (deg * Math.PI) / 180;
}

/**
 * Rotate every segment by `angleRad` around the entity's pivot, rasterize
 * each segment to a deduped cell map, then sync the entity's `<g>` children
 * to match. We replace children wholesale — at the cell counts vector
 * shapes typically produce (a few hundred), DOM thrash is cheaper than a
 * keyed diff.
 */
function rasterizeAndPaint(e: VectorEntityRuntime, angleRad: number): void {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const out = new Map<string, { x: number; y: number; fill: string }>();
  for (const seg of e.segments) {
    if (seg.kind === "line") {
      const from = rotateAround(seg.from, e.pivot, cosA, sinA);
      const to = rotateAround(seg.to, e.pivot, cosA, sinA);
      rasterizeLine(from, to, seg.thickness, seg.fill, out);
    } else {
      const apex = rotateAround(seg.apex, e.pivot, cosA, sinA);
      const baseCenter = rotateAround(seg.baseCenter, e.pivot, cosA, sinA);
      rasterizeWedge(apex, baseCenter, seg.baseWidth, seg.fill, out);
    }
  }
  // Replace entity contents in one pass.
  while (e.group.firstChild) e.group.removeChild(e.group.firstChild);
  for (const cell of out.values()) {
    e.group.appendChild(buildCell(cell, e.cellSize));
  }
}

function rotateAround(
  p: { x: number; y: number },
  pivot: { x: number; y: number },
  cosA: number,
  sinA: number,
): { x: number; y: number } {
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * cosA - dy * sinA,
    y: pivot.y + dx * sinA + dy * cosA,
  };
}

/**
 * Rasterize a line segment into axis-aligned cells. Walks from `from` to
 * `to` at half-cell resolution, stamping a `thickness`-cell band
 * perpendicular to the line direction. Output cells are deduped via the
 * provided Map keyed on `"x,y"`.
 *
 * Coordinates are in cell units (fractional allowed). Rounded to integer
 * positions on stamp.
 */
export function rasterizeLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  thickness: number,
  fill: string,
  out: Map<string, { x: number; y: number; fill: string }>,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;

  // Sample at half-cell intervals — eliminates gaps in steep diagonals.
  const steps = Math.max(1, Math.ceil(len * 2));
  const perpX = -dy / len;
  const perpY = dx / len;

  // For thickness T, stamp [-floor((T-1)/2), +ceil((T-1)/2)] — works for
  // even and odd thicknesses without center-bias guesswork.
  const t = Math.max(1, Math.floor(thickness));
  const startW = -Math.floor((t - 1) / 2);
  const endW = Math.ceil((t - 1) / 2);

  for (let i = 0; i <= steps; i++) {
    const a = i / steps;
    const cx = from.x + dx * a;
    const cy = from.y + dy * a;
    for (let w = startW; w <= endW; w++) {
      const x = Math.round(cx + perpX * w);
      const y = Math.round(cy + perpY * w);
      const key = `${x},${y}`;
      if (!out.has(key)) out.set(key, { x, y, fill });
    }
  }
}

/**
 * Rasterize a tapered wedge — width 1 at `apex`, linearly widening to
 * `baseWidth` cells at `baseCenter`. Walks the centerline at half-cell
 * resolution, stamping a band whose width grows with t. Output cells
 * are deduped via the provided Map keyed on `"x,y"`.
 *
 * Coordinates are in cell units (fractional allowed). Rounded to integer
 * positions on stamp.
 */
export function rasterizeWedge(
  apex: { x: number; y: number },
  baseCenter: { x: number; y: number },
  baseWidth: number,
  fill: string,
  out: Map<string, { x: number; y: number; fill: string }>,
): void {
  const dx = baseCenter.x - apex.x;
  const dy = baseCenter.y - apex.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;

  const steps = Math.max(1, Math.ceil(len * 2));
  const perpX = -dy / len;
  const perpY = dx / len;
  const targetW = Math.max(1, Math.floor(baseWidth));

  for (let i = 0; i <= steps; i++) {
    const a = i / steps; // 0 at apex, 1 at base
    const cx = apex.x + dx * a;
    const cy = apex.y + dy * a;
    // Width at this position: linear from 1 (apex) to baseWidth (base).
    const widthAt = Math.max(1, Math.round(1 + (targetW - 1) * a));
    const startW = -Math.floor((widthAt - 1) / 2);
    const endW = Math.ceil((widthAt - 1) / 2);
    for (let w = startW; w <= endW; w++) {
      const x = Math.round(cx + perpX * w);
      const y = Math.round(cy + perpY * w);
      const key = `${x},${y}`;
      if (!out.has(key)) out.set(key, { x, y, fill });
    }
  }
}

/** Iteration limit derived from animation kind. `null` = run forever. */
export function periodLimitFor(animation: Animation): number | null {
  switch (animation.kind) {
    case "oscillate":
    case "pulse":
    case "bob":
    case "fade":
      // Oscillate-family: `repeat` is required.
      return animation.repeat === "infinite" ? null : animation.repeat;
    case "spin": {
      // `repeat` is optional and defaults to infinite.
      const repeat = animation.repeat ?? "infinite";
      return repeat === "infinite" ? null : repeat;
    }
    case "drift":
      // Continuous translation has no period; runs forever.
      return null;
  }
}

/**
 * Has the animation completed `periodLimit` iterations? Encapsulates the
 * fact that `drift` has no `durationMs` — the renderer can ask without
 * narrowing the union itself.
 */
export function isPeriodComplete(
  animation: Animation,
  elapsed: number,
  periodLimit: number,
): boolean {
  switch (animation.kind) {
    case "oscillate":
    case "spin":
    case "pulse":
    case "bob":
    case "fade":
      return elapsed / animation.durationMs >= periodLimit;
    case "drift":
      // Drift's periodLimit is always null, so this branch is unreachable in
      // practice. Return false defensively.
      return false;
  }
}

export function unionPixelSize(layers: Layer[]): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const l of layers) {
    width = Math.max(width, l.cellSize * l.width);
    height = Math.max(height, l.cellSize * l.height);
  }
  return { width, height };
}

export function centroid(cells: VoxelSpriteCell[]): { x: number; y: number } {
  if (cells.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (const c of cells) {
    const w = c.w ?? 1;
    const h = c.h ?? 1;
    const area = w * h;
    sx += (c.x + w / 2) * area;
    sy += (c.y + h / 2) * area;
    total += area;
  }
  return total === 0 ? { x: 0, y: 0 } : { x: sx / total, y: sy / total };
}
