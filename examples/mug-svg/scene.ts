import { sunburstGenerator } from "../../src/index.ts";
import type {
  Cell,
  Layer,
  Scene,
  SunburstConfig,
  VoxelSpriteCell,
} from "../../src/index.ts";

/**
 * Coffee-shop scene — a voxel sunset over a grass field.
 *
 * Composition:
 *  - Layer 0 (sky):    sunburstGenerator on the upper half. The generator
 *                      computes a radial gradient + rotating ray entity
 *                      centered on the horizon. Rays extend below the
 *                      horizon but get visually cut off by the ground layer
 *                      drawn on top.
 *  - Layer 1 (ground): hand-authored voxel grass — three greens in a
 *                      deterministic per-cell pattern, darker toward the
 *                      foreground.
 *  - Layer 2 (mug):    the v0.1 coffee mug, positioned so its body sits
 *                      on the horizon line. Oscillates on Y.
 */

const LAYER = { width: 100, height: 56, cellSize: 12 };
const HORIZON_Y = 30; // row index where sky ends and ground begins

// --- Sky (sunburst generator) --- //

const sunburstConfig: SunburstConfig = {
  palette: {
    center: "#ffd166", // warm yellow sun
    edge: "#1e3a5f", // deep blue sky at the top edge
    ray: "#fff5b0", // bright cream-yellow rays
  },
  rays: 12,
  rayLength: 26,
  rayHalfWidth: 1,
  bands: 7,
  rotationMs: 24000,
  rotationDirection: "ccw",
};

// The sky region is everything above the horizon. We pass a partial
// geometry to the generator so the radial gradient is centered on the
// SUN (at the horizon) rather than the geometric middle of the layer.
const skyGeometry = {
  width: LAYER.width,
  height: HORIZON_Y * 2, // doubled so the "center" of the gradient is on the horizon
  cellSize: LAYER.cellSize,
};
const skyOutput = sunburstGenerator(sunburstConfig, skyGeometry);
// Keep only the cells above the horizon — the lower half of the
// generator's output would intrude into the ground layer.
const skyCells = skyOutput.cells.filter((c) => c.y < HORIZON_Y);

const skyLayer: Layer = {
  id: "sky",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  cells: skyCells,
  // The generator's ray entity is positioned at (skyGeometry.width-1)/2,
  // (skyGeometry.height-1)/2 — i.e., the horizon center. Rays extend in
  // both directions; ground layer (zIndex 1) hides the lower half.
  entities: skyOutput.entities,
  zIndex: 0,
  opacity: 1,
  visible: true,
};

// --- Ground (voxel grass) --- //

const GRASS_GLOW = "#5a8266"; // cool teal-tinted grass at the horizon (catches the blue sky)
const GRASS_LIGHT = "#3d6033"; // brighter green
const GRASS_DARK = "#1f3a1a"; // darker green
const GRASS_TUFT = "#7ea84a"; // rare brighter tufts (very sparse)

/**
 * Hash → [0, 1). Inlined so the example stays self-contained.
 */
function noise(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function buildGroundCells(): Cell[] {
  const out: Cell[] = [];
  const groundRows = LAYER.height - HORIZON_Y;
  for (let y = HORIZON_Y; y < LAYER.height; y++) {
    const depthT = (y - HORIZON_Y) / Math.max(1, groundRows - 1); // 0 at horizon, 1 at bottom
    for (let x = 0; x < LAYER.width; x++) {
      // Per-cell hash drives the rare events (glow / tufts); patches use a
      // lower-resolution hash so cells cluster into 4×4 blocks of similar
      // tone rather than per-cell static.
      const cellN = noise(x, y);
      const blockN = noise(Math.floor(x / 4), Math.floor(y / 4));

      // Sunset/horizon-glow row — cool teal where sky meets ground.
      if (depthT < 0.07 && cellN < 0.55) {
        out.push({ x, y, fill: GRASS_GLOW });
        continue;
      }

      // Rare warm tufts (~1% of cells).
      if (cellN > 0.99) {
        out.push({ x, y, fill: GRASS_TUFT });
        continue;
      }

      // Two-tone field with depth-biased pick. Blocks of 4×4 share a base
      // hash so the pattern reads as patches, not noise.
      const fill = blockN + depthT * 0.6 < 0.55 ? GRASS_LIGHT : GRASS_DARK;
      out.push({ x, y, fill });
    }
  }
  return out;
}

const groundLayer: Layer = {
  id: "ground",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  cells: buildGroundCells(),
  entities: [],
  zIndex: 1, // above sky → obscures the lower half of the ray entity
  opacity: 1,
  visible: true,
};

// --- Mug (unchanged from v0.1, positioned on the horizon) --- //

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
  // Pivot at body center; entity-local y=6 is the bottom of the mug body.
  // Place the mug so its bottom rests on the horizon line plus a few cells
  // of grass — feels grounded, not floating.
  entities: [
    {
      id: "coffee-mug",
      position: { x: 50, y: HORIZON_Y - 4 },
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
  zIndex: 2,
  opacity: 1,
  visible: true,
};

export const coffeeShopScene: Scene = {
  layers: [skyLayer, groundLayer, mugLayer],
};
