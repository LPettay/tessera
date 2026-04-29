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
    center: "#ff8a3a", // setting-sun amber at the horizon
    edge: "#0c1424", // deep navy at the top of the sky
    ray: "#ffd87a", // bright cream-gold rays
  },
  rays: 12,
  rayLength: 26,
  rayHalfWidth: 1, // 3-cell wide rays (no longer spiderweb)
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

const GRASS_GLOW = "#a8825a"; // sunset-tinted grass at the horizon
const GRASS_HORIZON = "#6b8a3e"; // bright green near the horizon
const GRASS_MID = "#3d5a26"; // mid-field
const GRASS_DEEP = "#22381a"; // foreground
const GRASS_HIGHLIGHT = "#c8b46a"; // sparse warm tufts catching the sun

/**
 * Hash → [0, 1). Same trick as the sunburst dither, inlined to keep the
 * example self-contained.
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
      const n = noise(x, y);

      // Topmost two rows: mix in sunset glow with falling probability so
      // the horizon line dissolves into the field rather than cutting hard.
      if (depthT < 0.1 && n < 0.7) {
        out.push({ x, y, fill: GRASS_GLOW });
        continue;
      }

      // Sparse warm highlights scattered everywhere — tufts catching light.
      if (n > 0.96) {
        out.push({ x, y, fill: GRASS_HIGHLIGHT });
        continue;
      }

      // Three depth bands selected by depthT, but within each band the
      // pick is hash-jittered. Replaces the rigid (x+y)%2 stipple with
      // an organic, patchy texture.
      let fill: string;
      const pick = n + depthT * 0.4; // depth biases pick toward the darker tone
      if (pick < 0.4) {
        fill = depthT < 0.4 ? GRASS_HORIZON : GRASS_MID;
      } else if (pick < 0.75) {
        fill = depthT < 0.5 ? GRASS_MID : GRASS_DEEP;
      } else {
        fill = GRASS_DEEP;
      }
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
