import type {
  BackgroundGenerator,
  Cell,
  Entity,
  GeneratorGeometry,
  GeneratorOutput,
  VoxelSpriteCell,
} from "../../index.ts";

/**
 * Configuration for `sunburstGenerator`.
 *
 * The sunburst is built in two parts:
 *  - A static **quantized radial gradient** that fills every cell of the
 *    target Layer (the "whole screen is voxels" foundation).
 *  - A single rotating ray-overlay **entity** (optional) that spins on top.
 *
 * The gradient carries the visual; rays are an accent. This is deliberate —
 * single-cell rays at small cell sizes look jagged at diagonals, so they
 * shouldn't be the dominant element.
 */
export type SunburstConfig = {
  palette: {
    /** Brightest color, at the center of the gradient. */
    center: string;
    /** Darkest color, at the edge of the gradient. */
    edge: string;
    /** Color of the rotating ray overlay. */
    ray: string;
  };
  /** Number of rays in the rotating overlay. Try 8, 12, or 16. */
  rays: number;
  /** Length of each ray in cells, measured from center. */
  rayLength: number;
  /**
   * Half-width of each ray in cells, measured perpendicular to its direction.
   *  - `0` → single-cell rays (jaggy diagonals — looks like spiderweb)
   *  - `1` → 3-cell wide (recommended baseline)
   *  - `2` → 5-cell wide (chunky)
   * Default `1`.
   */
  rayHalfWidth?: number;
  /**
   * Number of distinct color bands in the gradient (center → edge).
   * Higher = smoother; lower = more "intentionally voxel". Default 6.
   */
  bands?: number;
  /**
   * Per-cell jitter added before band quantization, in fractions of one
   * band-width.
   *  - `0`   → hard concentric rings (the original look)
   *  - `0.5` → softly dithered band boundaries (frayed edges, organic)
   *  - `1`   → mostly noise; bands stop reading
   * Default `0.5`. Deterministic per (x, y) — re-running the generator
   * with the same config produces identical output.
   */
  bandJitter?: number;
  /** Ms per full ray rotation. Undefined = static rays. */
  rotationMs?: number;
  /** Ray rotation direction. Default `"ccw"`. */
  rotationDirection?: "cw" | "ccw";
};

export const sunburstGenerator: BackgroundGenerator<SunburstConfig> = (
  config,
  geometry,
): GeneratorOutput => ({
  cells: buildGradientCells(config, geometry),
  entities: buildRayEntities(config, geometry),
});

function buildGradientCells(
  config: SunburstConfig,
  geometry: GeneratorGeometry,
): Cell[] {
  const { width, height } = geometry;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  // Distance to a viewport corner — the "edge" of the gradient is the
  // farthest cell, which is always a corner of the layer rectangle.
  const maxDist = Math.hypot(cx, cy);
  const bands = Math.max(1, config.bands ?? 6);
  const jitter = Math.max(0, config.bandJitter ?? 0.5);

  const out: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const baseT = clamp01(Math.hypot(x - cx, y - cy) / maxDist);
      // Per-cell deterministic offset. Range is [-0.5, +0.5) of one band
      // width, so cells near a band boundary get a 50/50 shot at either
      // adjacent band — frayed edges, no ring artifact.
      const offset = (cellHash(x, y) - 0.5) * (jitter / bands);
      const t = clamp01(baseT + offset);
      const band = Math.min(bands - 1, Math.floor(t * bands));
      const banded = bands === 1 ? 0 : band / (bands - 1);
      out.push({
        x,
        y,
        fill: lerpColor(config.palette.center, config.palette.edge, banded),
      });
    }
  }
  return out;
}

/**
 * Deterministic hash → [0, 1). Plain integer-mixing PRNG; no allocations,
 * runs the same in Node and browsers. Used to dither gradient band edges.
 */
function cellHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function buildRayEntities(
  config: SunburstConfig,
  geometry: GeneratorGeometry,
): Entity[] {
  if (config.rays < 1 || config.rayLength < 1) return [];

  const halfWidth = Math.max(0, config.rayHalfWidth ?? 1);
  const cells: VoxelSpriteCell[] = [];
  // Dedupe cells that round to the same (x, y). Adjacent rays + perpendicular
  // stamps can land on the same cell; emitting duplicate rects is wasted work.
  const seen = new Set<string>();

  for (let r = 0; r < config.rays; r++) {
    const angle = (r * 2 * Math.PI) / config.rays;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Perpendicular to the ray direction (rotate 90°): used to thicken the
    // ray by emitting cells off-axis. Without this, diagonals staircase into
    // single-cell lines and read as spiderweb.
    const perpX = -sinA;
    const perpY = cosA;
    for (let i = 1; i <= config.rayLength; i++) {
      for (let w = -halfWidth; w <= halfWidth; w++) {
        const x = Math.round(cosA * i + perpX * w);
        const y = Math.round(sinA * i + perpY * w);
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cells.push({ x, y, fill: config.palette.ray });
      }
    }
  }

  const center = layerCenter(geometry);
  const animation =
    config.rotationMs !== undefined
      ? ({
          kind: "spin" as const,
          axis: "z" as const,
          durationMs: config.rotationMs,
          direction: config.rotationDirection ?? ("ccw" as const),
        })
      : undefined;

  return [
    {
      id: "sunburst-rays",
      position: center,
      shape: {
        kind: "voxel-sprite",
        pivot: { x: 0, y: 0 },
        cells,
      },
      animation,
    },
  ];
}

function layerCenter(geometry: GeneratorGeometry): { x: number; y: number } {
  return { x: (geometry.width - 1) / 2, y: (geometry.height - 1) / 2 };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerpColor(a: string, b: string, t: number): string {
  const av = parseInt(a.replace("#", ""), 16);
  const bv = parseInt(b.replace("#", ""), 16);
  const ar = (av >> 16) & 0xff;
  const ag = (av >> 8) & 0xff;
  const ab = av & 0xff;
  const br = (bv >> 16) & 0xff;
  const bg = (bv >> 8) & 0xff;
  const bb = bv & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | b2).toString(16).padStart(6, "0")}`;
}
