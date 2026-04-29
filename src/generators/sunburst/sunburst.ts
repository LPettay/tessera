import type {
  BackgroundGenerator,
  Cell,
  Entity,
  GeneratorGeometry,
  GeneratorOutput,
  VectorSegment,
} from "../../index.ts";

/**
 * Configuration for `sunburstGenerator`.
 *
 * The sunburst is composed of two parts:
 *  - **Static quantized radial gradient** filling every cell of the target
 *    Layer (the "whole screen is voxels" foundation).
 *  - **One rotating ray-overlay entity** built from `vector` segments — each
 *    ray is a continuous line that the renderer rasterizes to axis-aligned
 *    cells per frame (ADR 0014). Pixels stay locked to the grid at every
 *    rotation angle.
 *
 * The gradient does the visual lifting; rays are an accent that gives the
 * scene motion without dominating it.
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
   * Width of each ray in cells, perpendicular to its direction. Vector
   * rasterization stamps a band this many cells wide along the line. `1`
   * gives clean single-cell rays (axis-aligned at every angle); `3` gives
   * chunky bars; default `3`.
   */
  rayThickness?: number;
  /**
   * Number of distinct color bands in the gradient (center → edge).
   * Higher = smoother; lower = more "intentionally voxel". Default 6.
   */
  bands?: number;
  /**
   * Per-cell jitter added before band quantization, in fractions of one
   * band-width. `0` = hard concentric rings; `0.5` = softly dithered band
   * boundaries (frayed edges, organic). Default `0.5`. Deterministic per
   * (x, y).
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
      // Per-cell deterministic offset. Range is up to half a band on each
      // side, so cells near a band boundary get a 50/50 shot at either
      // adjacent band — frayed edges, no concentric-ring artifact.
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

function buildRayEntities(
  config: SunburstConfig,
  geometry: GeneratorGeometry,
): Entity[] {
  if (config.rays < 1 || config.rayLength < 1) return [];

  const thickness = Math.max(1, config.rayThickness ?? 3);
  const segments: VectorSegment[] = [];
  for (let r = 0; r < config.rays; r++) {
    const angle = (r * 2 * Math.PI) / config.rays;
    segments.push({
      kind: "line",
      from: { x: 0, y: 0 },
      to: {
        x: Math.cos(angle) * config.rayLength,
        y: Math.sin(angle) * config.rayLength,
      },
      thickness,
      fill: config.palette.ray,
    });
  }

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
      // Center of the layer — the ray entity's local origin is the pivot.
      position: { x: (geometry.width - 1) / 2, y: (geometry.height - 1) / 2 },
      shape: { kind: "vector", pivot: { x: 0, y: 0 }, segments },
      animation,
    },
  ];
}

/** Deterministic per-cell hash → [0, 1). Used to dither gradient band edges. */
function cellHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
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
