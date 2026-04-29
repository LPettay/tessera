import { sunburstGenerator } from "../../src/index.ts";
import type {
  Layer,
  Scene,
  SunburstConfig,
  VoxelSpriteCell,
} from "../../src/index.ts";

/**
 * Coffee-shop scene — sunburst gradient + vector ray entity behind the mug.
 *
 * The sunburst (gradient cells + rotating ray entity) comes from
 * `sunburstGenerator`. The ray entity uses the `vector` shape kind so
 * rotation rasterizes to axis-aligned cells per frame (ADR 0014). The
 * mug is the v0.1 hand-authored voxel-sprite, oscillating on Y.
 */

const LAYER = { width: 100, height: 56, cellSize: 12 };

const sunburstConfig: SunburstConfig = {
  palette: {
    // The radial gradient is the ATMOSPHERE — sunset colors. Multi-stop
    // because two-color RGB lerp turns yellow→purple into mud-brown in the
    // middle; staged stops let us hit golden, orange, crimson, indigo as
    // distinct bands while still feeling continuous.
    stops: [
      { t: 0.0, color: "#fff2c2" }, // bright halo right at the sun
      { t: 0.2, color: "#ffd166" }, // golden
      { t: 0.45, color: "#f57350" }, // warm orange
      { t: 0.65, color: "#a83a5e" }, // crimson dusk
      { t: 0.85, color: "#3a1a55" }, // deep purple twilight
      { t: 1.0, color: "#0a0a26" }, // night sky at the edges
    ],
    // The rays ARE the sun — bright cream-white, brighter than any
    // gradient stop so they read as light, not foreground decoration.
    ray: "#fffaef",
  },
  rays: 14,
  // Long enough that wedge tips run off-screen — gives the "rays filling
  // the sky" effect, no visible blunt ends.
  rayLength: 70,
  rayBaseWidth: 10,
  bands: 9,
  bandJitter: 0.5,
  rotationMs: 24000,
  rotationDirection: "ccw",
};

const sunburst = sunburstGenerator(sunburstConfig, LAYER);

const sunburstLayer: Layer = {
  id: "sunburst",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  cells: sunburst.cells,
  entities: sunburst.entities,
  zIndex: 0,
  opacity: 1,
  visible: true,
};

// --- Mug --- //

const MUG = "#8b5e3c";
const MUG_LIGHT = "#a07a5a";
const MUG_DARK = "#5e3e26";
const MUG_CORNER = "#2e1f13";
const COFFEE = "#4a2818";
const COFFEE_DARK = "#2a1810";
const COFFEE_LIGHT = "#6b4128";
const HANDLE_HOLE = "#0a0a0a";

const mugCells: VoxelSpriteCell[] = [
  { x: -6, y: -7, w: 12, h: 14, fill: MUG },
  { x: -6, y: -6, w: 1, h: 12, fill: MUG_LIGHT },
  { x: 4, y: -6, w: 2, h: 12, fill: MUG_DARK },
  { x: -5, y: 6, w: 10, h: 1, fill: MUG_DARK },
  { x: -6, y: 6, fill: MUG_CORNER },
  { x: 5, y: 6, fill: MUG_CORNER },
  { x: 6, y: -5, fill: MUG },
  { x: 7, y: -5, fill: MUG },
  { x: 8, y: -4, fill: MUG },
  { x: 9, y: -3, fill: MUG },
  { x: 9, y: -2, fill: MUG_DARK },
  { x: 9, y: -1, fill: MUG_DARK },
  { x: 8, y: 0, fill: MUG_DARK },
  { x: 7, y: 1, fill: MUG_DARK },
  { x: 6, y: 1, fill: MUG_DARK },
  { x: 7, y: -4, fill: HANDLE_HOLE },
  { x: 7, y: -3, fill: HANDLE_HOLE },
  { x: 7, y: -2, fill: HANDLE_HOLE },
  { x: 7, y: -1, fill: HANDLE_HOLE },
  { x: 7, y: 0, fill: HANDLE_HOLE },
  { x: 8, y: -2, fill: HANDLE_HOLE },
  { x: 8, y: -1, fill: HANDLE_HOLE },
  { x: -5, y: -7, w: 10, h: 1, fill: COFFEE_DARK },
  { x: -4, y: -8, w: 8, h: 1, fill: COFFEE_DARK },
  { x: -3, y: -7, w: 2, h: 1, fill: COFFEE },
  { x: -2, y: -8, w: 2, h: 1, fill: COFFEE_LIGHT },
];

const mugLayer: Layer = {
  id: "mug",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [
    {
      id: "coffee-mug",
      position: { x: 50, y: 32 },
      shape: { kind: "voxel-sprite", pivot: { x: 0, y: 0 }, cells: mugCells },
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
};

export const coffeeShopScene: Scene = {
  layers: [sunburstLayer, mugLayer],
};
