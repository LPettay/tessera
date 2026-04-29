import type { Scene, VectorSegment, VoxelSpriteCell } from "../../src/index.ts";

/**
 * Coffee-shop scene — sunburst background spinning on Z, mug rotating
 * on Y in front. The v0.1 regression test for both `Animation` kinds
 * (`oscillate` and `spin`) plus multi-layer rendering.
 *
 * Origin: the MotionPitch coffee mug (LPettay/portland-hackathon,
 * src/templates/coffee-shop.tsx). Mug cells are entity-local with
 * pivot at origin; sunburst cells are computed at module load.
 */

const MUG = "#8b5e3c";
const MUG_LIGHT = "#a07a5a";
const MUG_DARK = "#5e3e26";
const MUG_CORNER = "#2e1f13";
const COFFEE = "#4a2818";
const COFFEE_DARK = "#2a1810";
const COFFEE_LIGHT = "#6b4128";
const HANDLE_HOLE = "#0a0a0a";

const SUNBURST_LONG = "#5e3e26";
const SUNBURST_SHORT = "#3a2515";

const mugCells: VoxelSpriteCell[] = [
  // Body — solid fill drawn first; later cells overlay specific regions.
  { x: -6, y: -7, w: 12, h: 14, fill: MUG },

  // Side shading.
  { x: -6, y: -6, w: 1, h: 12, fill: MUG_LIGHT },
  { x: 4, y: -6, w: 2, h: 12, fill: MUG_DARK },
  { x: -5, y: 6, w: 10, h: 1, fill: MUG_DARK },

  // Faux rounded bottom corners.
  { x: -6, y: 6, fill: MUG_CORNER },
  { x: 5, y: 6, fill: MUG_CORNER },

  // Handle outer "C" — top half.
  { x: 6, y: -5, fill: MUG },
  { x: 7, y: -5, fill: MUG },
  { x: 8, y: -4, fill: MUG },
  { x: 9, y: -3, fill: MUG },
  // Handle outer "C" — bottom half (in shadow).
  { x: 9, y: -2, fill: MUG_DARK },
  { x: 9, y: -1, fill: MUG_DARK },
  { x: 8, y: 0, fill: MUG_DARK },
  { x: 7, y: 1, fill: MUG_DARK },
  { x: 6, y: 1, fill: MUG_DARK },

  // Handle interior void — the hole the user's fingers go through.
  { x: 7, y: -4, fill: HANDLE_HOLE },
  { x: 7, y: -3, fill: HANDLE_HOLE },
  { x: 7, y: -2, fill: HANDLE_HOLE },
  { x: 7, y: -1, fill: HANDLE_HOLE },
  { x: 7, y: 0, fill: HANDLE_HOLE },
  { x: 8, y: -2, fill: HANDLE_HOLE },
  { x: 8, y: -1, fill: HANDLE_HOLE },

  // Coffee surface — rim and the meniscus that wraps over the lip.
  { x: -5, y: -7, w: 10, h: 1, fill: COFFEE_DARK },
  { x: -4, y: -8, w: 8, h: 1, fill: COFFEE_DARK },
  { x: -3, y: -7, w: 2, h: 1, fill: COFFEE },
  { x: -2, y: -8, w: 2, h: 1, fill: COFFEE_LIGHT },
];

/**
 * 12-ray sunburst as `vector` segments — pixel-locked rotation.
 *
 * Each ray is a `VectorSegment` line from (0, 0) outward. The renderer
 * rotates the endpoints in cell-space and rasterizes them per frame to
 * axis-aligned cells, so every ray stays clean at every angle (no
 * tilted-cell stair-stepping). See ADR 0014.
 */
function buildSunburstSegments(): VectorSegment[] {
  const segments: VectorSegment[] = [];
  const rays = 12;
  const longLen = 22;
  const shortLen = 12;
  for (let r = 0; r < rays; r++) {
    const angle = (r * 2 * Math.PI) / rays;
    const isLong = r % 2 === 0;
    const length = isLong ? longLen : shortLen;
    segments.push({
      kind: "line",
      from: { x: 0, y: 0 },
      to: { x: Math.cos(angle) * length, y: Math.sin(angle) * length },
      thickness: 3,
      fill: isLong ? SUNBURST_LONG : SUNBURST_SHORT,
    });
  }
  return segments;
}

export const coffeeShopScene: Scene = {
  layers: [
    {
      id: "sunburst",
      cellSize: 12,
      width: 100,
      height: 56,
      entities: [
        {
          id: "sunburst",
          // Center of the layer.
          position: { x: 50, y: 28 },
          shape: {
            kind: "vector",
            pivot: { x: 0, y: 0 },
            segments: buildSunburstSegments(),
          },
          animation: {
            kind: "spin",
            axis: "z",
            // One full rotation every 30s — slow enough to feel ambient,
            // not slow enough to feel broken. With vector rasterization,
            // the rays stay clean at every intermediate angle.
            durationMs: 30000,
            direction: "ccw",
          },
        },
      ],
      zIndex: 0,
      opacity: 1,
      visible: true,
    },
    {
      id: "mug",
      cellSize: 12,
      width: 100,
      height: 56,
      entities: [
        {
          id: "coffee-mug",
          // Centered horizontally; biased a touch below center so the mug
          // feels grounded against the radiating sunburst.
          position: { x: 50, y: 32 },
          shape: {
            kind: "voxel-sprite",
            pivot: { x: 0, y: 0 },
            cells: mugCells,
          },
          animation: {
            kind: "oscillate",
            axis: "y",
            degrees: 22,
            durationMs: 6500,
            repeat: "infinite",
          },
        },
      ],
      zIndex: 1,
      opacity: 1,
      visible: true,
    },
  ],
};
