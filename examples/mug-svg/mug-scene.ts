import type { Scene, VoxelSpriteCell } from "../../src/index.ts";

/**
 * The MotionPitch coffee mug, ported to Tessera primitives.
 *
 * Original: ~230 lines of hand-positioned <rect> elements in a React
 * component (LPettay/portland-hackathon, src/templates/coffee-shop.tsx).
 * Here: a Scene with one Layer holding one Entity whose voxel-sprite
 * shape is the same rect grid, expressed in entity-local cell coords
 * (pivot at origin, X to the right, Y down).
 *
 * The Y-rotation oscillation (±22°, 6.5s period) is identical to the
 * MotionPitch original. Steam wisps are deferred — they require a
 * translate-style animation that v0.1 does not yet support.
 */

const MUG = "#8b5e3c";
const MUG_LIGHT = "#a07a5a";
const MUG_DARK = "#5e3e26";
const MUG_CORNER = "#2e1f13";
const COFFEE = "#4a2818";
const COFFEE_DARK = "#2a1810";
const COFFEE_LIGHT = "#6b4128";
const HANDLE_HOLE = "#0a0a0a";

const mugCells: VoxelSpriteCell[] = [
  // Body — solid fill, drawn first; later cells overlay specific regions.
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

export const mugScene: Scene = {
  layers: [
    {
      id: "mug",
      cellSize: 12,
      width: 30,
      height: 24,
      entities: [
        {
          id: "coffee-mug",
          // Centered horizontally; biased slightly above center to leave
          // headroom — the rotation amplifies the apparent footprint.
          position: { x: 15, y: 12 },
          shape: {
            kind: "voxel-sprite",
            // Pivot is the entity origin — cells were authored relative to
            // it, so rotation is naturally body-centered.
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
      zIndex: 0,
      opacity: 1,
      visible: true,
    },
  ],
};
