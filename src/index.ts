/**
 * Tessera — public API surface.
 *
 * Every name re-exported from this file is part of the published API.
 * Changes here require an ADR and an update to docs/api-surface.txt;
 * see docs/decisions/0007-public-api-surface-contract.md.
 *
 * v0.1 surface: scene description types + renderer contract. Renderer
 * implementations and the auto-selecting `mount()` factory are added in
 * subsequent PRs.
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
