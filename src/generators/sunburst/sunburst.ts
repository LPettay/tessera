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
   * Number of distinct color bands in the gradient (center → edge).
   * Higher = smoother; lower = more "intentionally voxel". Default 6.
   */
  bands?: number;
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

  const out: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = clamp01(Math.hypot(x - cx, y - cy) / maxDist);
      // Quantize into discrete bands. The `(bands - 1)` denominator gives
      // each band a different color value (otherwise the last band collapses
      // to t == 1).
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

  const cells: VoxelSpriteCell[] = [];
  for (let r = 0; r < config.rays; r++) {
    const angle = (r * 2 * Math.PI) / config.rays;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let i = 1; i <= config.rayLength; i++) {
      cells.push({
        x: Math.round(cosA * i),
        y: Math.round(sinA * i),
        fill: config.palette.ray,
      });
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
