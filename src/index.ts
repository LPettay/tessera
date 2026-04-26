/**
 * Tessera — public API surface.
 *
 * Every name re-exported from this file is part of the published API.
 * Changes here require an ADR and an update to docs/api-surface.txt;
 * see docs/decisions/0007-public-api-surface-contract.md.
 *
 * v0.1 surface: scene description types + renderer contract + the SVG
 * renderer (Tier 1) + the page-citizenship wrapper. Higher renderer tiers
 * and the auto-selecting `mount()` factory land in subsequent milestones.
 */

export type {
  Scene,
  Layer,
  Cell,
  Entity,
  EntityShape,
  VoxelSpriteCell,
  Animation,
} from "./core/scene.ts";

export type {
  Renderer,
  RendererCapabilities,
  RendererController,
  RendererTier,
} from "./core/renderer.ts";

export { withPageCitizenship } from "./core/page-citizenship.ts";
export { svgRenderer } from "./renderers/svg/index.ts";
