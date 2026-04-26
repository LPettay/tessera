import type {
  Animation,
  Cell,
  Layer,
  OscillateAnimation,
  SpinAnimation,
  VoxelSpriteCell,
} from "../../core/scene.ts";

/**
 * Pure helpers for the SVG renderer. Split out so svg-renderer.ts can stay
 * focused on the controller lifecycle and stay under the per-file size budget.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

export type EntityRuntime = {
  /** The entity's `<g>`, used as the rotation/translate target every frame. */
  group: SVGGElement;
  /** Cached translation so we can compose rotation without re-reading DOM. */
  translate: string;
  animation: Animation;
  /** Wallclock at first paint of this animation; resets across pause/resume. */
  startedAt: number;
  /** Period count after which an entity stops (oscillate `repeat: number`). */
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
  switch (e.animation.kind) {
    case "oscillate":
      applyOscillate(e, elapsed, e.animation);
      return;
    case "spin":
      applySpin(e, elapsed, e.animation);
      return;
  }
}

function applyOscillate(e: EntityRuntime, elapsed: number, anim: OscillateAnimation): void {
  // x and z are reserved at the type level; v0.1 SVG only animates y.
  if (anim.axis !== "y") {
    e.group.style.transform = e.translate;
    return;
  }
  const angle = anim.degrees * Math.sin((2 * Math.PI * elapsed) / anim.durationMs);
  e.group.style.transform = `${e.translate} rotate3d(0, 1, 0, ${angle}deg)`;
}

function applySpin(e: EntityRuntime, elapsed: number, anim: SpinAnimation): void {
  // x and y are reserved at the type level; v0.1 SVG only animates z (in-plane rotation).
  if (anim.axis !== "z") {
    e.group.style.transform = e.translate;
    return;
  }
  const sign = anim.direction === "ccw" ? -1 : 1;
  const angle = sign * 360 * (elapsed / anim.durationMs);
  e.group.style.transform = `${e.translate} rotate(${angle}deg)`;
}

/** Iteration limit derived from animation kind. `null` = run forever. */
export function periodLimitFor(animation: Animation): number | null {
  if (animation.kind === "oscillate") {
    return animation.repeat === "infinite" ? null : animation.repeat;
  }
  // spin: repeat is optional and defaults to infinite.
  const repeat = animation.repeat ?? "infinite";
  return repeat === "infinite" ? null : repeat;
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
