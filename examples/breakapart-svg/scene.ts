/**
 * Breakapart scene — demonstrates the `tween` Animation kind (ADR 0020).
 *
 * "TESSERA" is rasterized into its individual glyph-pixel cells, then each
 * cell becomes a standalone Entity with a `tween` animation that flies it
 * outward from the text centroid and back, forever. The net effect: voxels
 * scatter and reform in continuous motion — proof that Tessera deals in
 * composable cell primitives, not static images.
 */

import type { Entity, Layer, Scene } from "../../src/index.ts";
import { rasterizeText } from "../../src/index.ts";

const LAYER = { width: 100, height: 56, cellSize: 12 };

/** Glyph pixel size in layer cells. At 1.5, each pixel = 18 SVG px. */
const SCALE = 1.5;

const GOLD = "#ffd166";
const GOLD_DIM = "#6b5a28";

/**
 * "TESSERA" geometry at SCALE=1.5:
 *   measureText: width = (7×5 + 6×1) × 1.5 = 61.5 cells
 *                height = 7 × 1.5 = 10.5 cells
 * Centre the block at (50, 28) in layer space.
 */
const TEXT_W = (7 * 5 + 6 * 1) * SCALE; // 61.5 cells
const TEXT_H = 7 * SCALE; // 10.5 cells
const ORIGIN_X = 50 - TEXT_W / 2; // 19.25
const ORIGIN_Y = 28 - TEXT_H / 2; // 22.75

/** Centroid of the text block in text-local coordinates. */
const CX = TEXT_W / 2; // 30.75
const CY = TEXT_H / 2; // 5.25

/**
 * Cheap deterministic hash → [0, 1). Avoids Math.random() so the scene
 * is stable across module loads and hot-reload cycles.
 */
function hashU01(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 15), 0xac4d1b);
  return ((n >>> 0) & 0xffffff) / 0x1000000;
}

const rawCells = rasterizeText({
  kind: "text",
  text: "TESSERA",
  fill: GOLD,
  scale: SCALE,
});

/**
 * One Entity per glyph pixel. Each entity is a single square cell at
 * `ORIGIN + cell.position` (absolute layer coords), animated with a
 * `tween` that flies it outward from the text centroid and back.
 */
const cellEntities: Entity[] = rawCells.map((cell, i) => {
  const j1 = hashU01(i * 127 + 1);
  const j2 = hashU01(i * 113 + 2);

  // Outward direction from centroid.
  const ddx = cell.x - CX;
  const ddy = cell.y - CY;
  const dist = Math.hypot(ddx, ddy) || 0.1;
  const nx = ddx / dist;
  const ny = ddy / dist;

  // Magnitude: 13–21 cells. Cells farther from centre travel slightly
  // further so the explosion feels energetic at the edges.
  const magnitude = 13 + j1 * 8 + dist * 0.12;

  // Duration: 700–1100 ms per one-way trip. Varied so cells drift out of
  // phase within 2-3 cycles, turning one synchronized burst into a fluid
  // shimmering wave.
  const durationMs = 700 + j2 * 400;

  const cw = cell.w ?? SCALE;
  const ch = cell.h ?? SCALE;

  return {
    id: `bc-${i}`,
    position: { x: ORIGIN_X + cell.x, y: ORIGIN_Y + cell.y },
    shape: {
      kind: "voxel-sprite",
      cells: [{ x: 0, y: 0, w: cw, h: ch, fill: cell.fill }],
      pivot: { x: cw / 2, y: ch / 2 },
    },
    animation: {
      kind: "tween",
      dx: nx * magnitude,
      dy: ny * magnitude,
      durationMs,
      easing: "ease-in-out",
      yoyo: true,
      repeat: "infinite",
    },
  };
});

/**
 * Small static label near the bottom.
 * "VOXEL BREAKAPART" at scale 0.35:
 *   width = (16×5 + 15×1) × 0.35 = 33.25 cells → pivot.x ≈ 16.6
 *   height = 7 × 0.35 = 2.45 cells → pivot.y ≈ 1.2
 */
const label: Entity = {
  id: "label",
  position: { x: 50, y: 50 },
  shape: {
    kind: "text",
    text: "VOXEL BREAKAPART",
    fill: GOLD_DIM,
    scale: 0.35,
    pivot: { x: 16.6, y: 1.2 },
  },
};

const mainLayer: Layer = {
  id: "main",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [...cellEntities, label],
  zIndex: 0,
  opacity: 1,
  visible: true,
};

export const breakapartScene: Scene = {
  layers: [mainLayer],
};
