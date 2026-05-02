/**
 * Tessera — public API surface.
 *
 * Every name re-exported from this file is part of the published API.
 * Changes here require an ADR and an update to docs/api-surface.txt;
 * see docs/decisions/0007-public-api-surface-contract.md.
 *
 * v0.1: scene description types + renderer contract + SVG renderer (Tier 1)
 * + page-citizenship wrapper.
 * v0.2: `BackgroundGenerator<Config>` primitive — pure functions that emit
 * cells + entities for layer fills. Concrete generators ship in subsequent
 * PRs; this PR lands only the contract.
 */

export type {
  Scene,
  Layer,
  Cell,
  Entity,
  EntityShape,
  VectorSegment,
  LineSegment,
  WedgeSegment,
  VoxelSpriteCell,
  Animation,
  OscillateAnimation,
  SpinAnimation,
  PulseAnimation,
  BobAnimation,
  FadeAnimation,
  DriftAnimation,
} from "./core/scene.ts";

export type {
  Renderer,
  RendererCapabilities,
  RendererController,
  RendererTier,
} from "./core/renderer.ts";

export type {
  BackgroundGenerator,
  GeneratorGeometry,
  GeneratorOutput,
} from "./core/generator.ts";

export { withPageCitizenship } from "./core/page-citizenship.ts";
export { svgRenderer } from "./renderers/svg/index.ts";

export { sunburstGenerator } from "./generators/sunburst/index.ts";
export type { SunburstConfig } from "./generators/sunburst/index.ts";
