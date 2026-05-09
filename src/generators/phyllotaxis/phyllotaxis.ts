/**
 * Phyllotaxis generator — mathematically-placed dots following the golden
 * angle (137.508°), the same pattern nature uses in sunflowers, pine cones,
 * and leaf spirals. See ADR 0026.
 *
 * Each dot index n is placed at polar coords (√n · dotScale, n · φ) where
 * φ = π(3 − √5) is the golden angle. The resulting spiral packs points with
 * maximum angular separation, producing Fibonacci-count arms automatically.
 */

import type { BackgroundGenerator, Cell, Entity, GeneratorGeometry } from "../../index.ts";
import { lerpColor } from "../../index.ts";

/** Golden angle in radians: 2π / φ² ≈ 137.508° */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type PhyllotaxisConfig = {
  /**
   * Number of dots to place. ~200–600 fills a typical viewport at dotScale 2.
   * More dots reveal more spiral arms; fewer dots show the open structure.
   */
  count: number;
  /**
   * Radial spacing coefficient. Each dot sits at radius √n · dotScale cells
   * from centre. Larger values spread dots further apart. Try 1.5–3.
   */
  dotScale: number;
  /** Background fill for cells that are not a phyllotaxis dot. */
  background: string;
  /** Palette: dot color near the centre and near the outer edge. */
  palette: { inner: string; outer: string };
};

export const phyllotaxisGenerator: BackgroundGenerator<PhyllotaxisConfig> = (
  config: PhyllotaxisConfig,
  geometry: GeneratorGeometry,
) => {
  const { width, height } = geometry;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;

  // Background — fill every cell so the layer has a solid canvas.
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ x, y, fill: config.background });
    }
  }

  // Dots — one entity per point so each is individually addressable by
  // the cursor field or an onFrame hook.
  const entities: Entity[] = [];
  for (let n = 0; n < config.count; n++) {
    const angle = n * GOLDEN_ANGLE;
    const r = Math.sqrt(n) * config.dotScale;
    const x = Math.round(cx + r * Math.cos(angle));
    const y = Math.round(cy + r * Math.sin(angle));

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // Color varies from inner → outer as n increases — makes the spiral
    // arms visible through color banding.
    const t = n / (config.count - 1 || 1);
    const fill = lerpColor(config.palette.inner, config.palette.outer, t);

    entities.push({
      id: `phyllotaxis.dot.${n}`,
      position: { x, y },
      shape: {
        kind: "voxel-sprite",
        cells: [{ x: 0, y: 0, fill }],
        pivot: { x: 0.5, y: 0.5 },
      },
    });
  }

  return { cells, entities };
};
