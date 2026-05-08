/**
 * Cell drawing helpers — pure functions emitting `VoxelSpriteCell[]`.
 *
 * Layer **L1** in the abstraction stack from ADR 0021. Every helper here
 * either *is* the atom or *emits* the atom; nothing animates, mounts, or
 * touches the DOM. Composes via array concatenation:
 *
 *   const cells: VoxelSpriteCell[] = [
 *     ...rect(0, 0, 100, 20, "#222"),
 *     ...grid(2, 2, 16, 16, "#eee"),
 *     ...outline(0, 0, 100, 20, "#444"),
 *   ];
 *
 * All helpers expect integer `w`/`h`. Fractional `x`/`y` are honoured for
 * `rect` (which emits a single `VoxelSpriteCell` with arbitrary geometry)
 * but truncated for grid-emitting helpers, which iterate over discrete
 * unit-cell positions.
 *
 * See ADR 0022.
 */

import type { VoxelSpriteCell } from "./scene.ts";

/**
 * Single rectangular cell with arbitrary `w`/`h`. Emits *one*
 * `VoxelSpriteCell` with the requested geometry — cheap, but the
 * resulting cell can't be addressed per-pixel by an animation or a
 * field.
 *
 * Use this for purely visual regions (taskbar background, window
 * chrome fill) where each pixel doesn't need to react independently.
 * For per-cell addressability, see `grid`.
 */
export function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): VoxelSpriteCell[] {
  return [{ x, y, w, h, fill }];
}

/**
 * Grid of unit cells (`w × h` of them). Each emitted cell is 1×1 in
 * cell-space, so each is individually addressable by an animation or
 * field — the cost is `w * h` cells in the scene.
 *
 * Use this when the region needs to react per-cell (a panel that
 * dissolves under the cursor, a button that bobs each pixel out of
 * phase).
 */
export function grid(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): VoxelSpriteCell[] {
  const out: VoxelSpriteCell[] = [];
  const W = Math.max(0, Math.floor(w));
  const H = Math.max(0, Math.floor(h));
  for (let dy = 0; dy < H; dy++) {
    for (let dx = 0; dx < W; dx++) {
      out.push({ x: x + dx, y: y + dy, fill });
    }
  }
  return out;
}

/**
 * Hollow rectangular outline. Emits unit cells along the perimeter,
 * `thickness` cells deep (default 1). When `thickness * 2 >= min(w, h)`
 * the outline degenerates to a solid grid — graceful, but probably a
 * bug at the call site.
 */
export function outline(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  thickness: number = 1,
): VoxelSpriteCell[] {
  const out: VoxelSpriteCell[] = [];
  const W = Math.max(0, Math.floor(w));
  const H = Math.max(0, Math.floor(h));
  const t = Math.max(1, Math.floor(thickness));
  for (let dy = 0; dy < H; dy++) {
    for (let dx = 0; dx < W; dx++) {
      const onEdge = dx < t || dx >= W - t || dy < t || dy >= H - t;
      if (onEdge) out.push({ x: x + dx, y: y + dy, fill });
    }
  }
  return out;
}

/**
 * Linear colour gradient over a `w × h` grid of unit cells. `from`
 * lives at the start edge (left for `"horizontal"`, top for
 * `"vertical"`); `to` lives at the opposite edge.
 *
 * Each cell's fill is `lerpColor(from, to, t)` where `t` is the cell's
 * position along the gradient axis in `[0, 1]`. With `w` (or `h`) of 1,
 * `t` is clamped to 0 — single-cell strips render as `from`.
 */
export function gradient(
  x: number,
  y: number,
  w: number,
  h: number,
  from: string,
  to: string,
  direction: "horizontal" | "vertical",
): VoxelSpriteCell[] {
  const out: VoxelSpriteCell[] = [];
  const W = Math.max(0, Math.floor(w));
  const H = Math.max(0, Math.floor(h));
  const span = direction === "horizontal" ? W : H;
  const denom = Math.max(1, span - 1);
  for (let dy = 0; dy < H; dy++) {
    for (let dx = 0; dx < W; dx++) {
      const t = direction === "horizontal" ? dx / denom : dy / denom;
      out.push({ x: x + dx, y: y + dy, fill: lerpColor(from, to, t) });
    }
  }
  return out;
}

/**
 * Linearly interpolate two `#rrggbb` hex colours. `t` is clamped to
 * `[0, 1]`. Returns `#rrggbb`.
 *
 * Inputs MUST be 7-character `#rrggbb` strings — short-form (`#rgb`),
 * named colours, and `rgba()` are not supported. Garbage in, garbage
 * out: malformed input parses as `NaN` channels and produces `#NaNNaNNaN`,
 * which fails fast at render time.
 */
export function lerpColor(from: string, to: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const fr = parseInt(from.slice(1, 3), 16);
  const fg = parseInt(from.slice(3, 5), 16);
  const fb = parseInt(from.slice(5, 7), 16);
  const tr = parseInt(to.slice(1, 3), 16);
  const tg = parseInt(to.slice(3, 5), 16);
  const tb = parseInt(to.slice(5, 7), 16);
  const r = Math.round(fr + (tr - fr) * k);
  const g = Math.round(fg + (tg - fg) * k);
  const b = Math.round(fb + (tb - fb) * k);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

function hex2(n: number): string {
  const c = Math.max(0, Math.min(255, n));
  return c.toString(16).padStart(2, "0");
}
