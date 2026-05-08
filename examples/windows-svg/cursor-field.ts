/**
 * Cursor-repulsion field — a generic L4 effect built on the `onFrame` hook
 * (ADR 0024). Walk the scene at install time, snapshot every entity's
 * cell-space position, and on each frame push entities within `radius`
 * (viewBox units) of the cursor away by up to `maxDisplacement` cells.
 *
 * The function is pure-ish: it reads the scene once at install time and
 * thereafter writes only via `controller.onFrame` -> `ctx.setOffset`.
 * The scene object is never mutated.
 *
 * Coordinate-space contract:
 *  - `radius` is in **viewBox** units. ADR 0024 fixes viewBox space as the
 *    one coordinate system every layer can convert to with a divide, which
 *    is what we want for multi-density scenes (a single radius "feels" the
 *    same regardless of which layer an entity belongs to).
 *  - `maxDisplacement` is in cell units of each entity's own parent layer.
 *    A 1-cell push on a cellSize=4 layer moves 4 viewBox units; on a
 *    cellSize=8 layer it moves 8. That's deliberate — the displacement
 *    feels chunkier on coarse layers, matching their visual grain.
 */

import type {
  Entity,
  FrameContext,
  Layer,
  RendererController,
  Scene,
} from "../../src/index.ts";

export type CursorFieldOptions = {
  /** Radius of influence in viewBox units (= cellSize × cell-space).
   *  Entities outside this radius from the cursor are unaffected. */
  radius: number;
  /** Max push distance in cell units of each entity's parent layer.
   *  An entity right at the cursor gets the full maxDisplacement;
   *  one at the edge of `radius` gets ~zero (after falloff). */
  maxDisplacement: number;
  /** Falloff curve for the strength factor based on normalised distance.
   *  Default "smooth" (cubic smoothstep). */
  falloff?: "linear" | "smooth";
  /** Optional whitelist of layer ids to influence. Default: all layers. */
  layerIds?: string[];
};

/** Internal: a flat record of every entity we'll consider each frame. */
type EntityRef = {
  layerId: string;
  entityId: string;
  /** Position x in the parent layer's cell space (snapshot at install). */
  x: number;
  /** Position y in the parent layer's cell space (snapshot at install). */
  y: number;
  /** Pixel size of one cell in the parent layer (viewBox units). */
  cellSize: number;
};

/**
 * Install a cursor-repulsion field on a controller. Returns a dispose
 * function that cancels the onFrame callback.
 */
export function installCursorField(
  controller: RendererController,
  scene: Scene,
  opts: CursorFieldOptions,
): () => void {
  const falloff: "linear" | "smooth" = opts.falloff ?? "smooth";
  const radius = opts.radius;
  const maxDisplacement = opts.maxDisplacement;
  const layerWhitelist =
    opts.layerIds && opts.layerIds.length > 0
      ? new Set(opts.layerIds)
      : null;

  // Phase 1: snapshot every relevant entity's cell-space position.
  const refs: EntityRef[] = [];
  for (const layer of scene.layers as Layer[]) {
    if (layerWhitelist && !layerWhitelist.has(layer.id)) continue;
    const cellSize = layer.cellSize;
    const layerId = layer.id;
    for (const entity of layer.entities as Entity[]) {
      refs.push({
        layerId,
        entityId: entity.id,
        x: entity.position.x,
        y: entity.position.y,
        cellSize,
      });
    }
  }

  // Guard against a degenerate radius — skip the per-frame work entirely.
  if (radius <= 0 || refs.length === 0) {
    return controller.onFrame(() => {});
  }

  const cancel = controller.onFrame((ctx: FrameContext) => {
    const cursor = ctx.cursor;
    if (cursor === null) return;

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i]!;
      const cellSize = ref.cellSize;
      // Cursor in this layer's cell space.
      const cursorXCells = cursor.x / cellSize;
      const cursorYCells = cursor.y / cellSize;

      // Vector from cursor to entity (entity moves AWAY from cursor, so
      // direction is `entity - cursor`).
      const dx = ref.x - cursorXCells;
      const dy = ref.y - cursorYCells;
      const distCells = Math.hypot(dx, dy);

      // Distance in viewBox units, so a single `radius` works across
      // layers with different `cellSize`s.
      const distVB = distCells * cellSize;
      if (distVB >= radius) continue;

      // Normalised proximity in [0, 1]: 1 at cursor, 0 at radius edge.
      let t = 1 - distVB / radius;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      // Smoothstep gives a more pleasant falloff than linear — derivative
      // is 0 at both endpoints so entities "ease out" of the field rather
      // than stopping abruptly at the radius.
      const strength = falloff === "smooth" ? t * t * (3 - 2 * t) : t;

      // Direction unit vector. If the entity is exactly under the cursor
      // we'd divide by zero — pick a fixed jitter direction so the entity
      // still gets pushed instead of sitting forever at the singularity.
      let dirX: number;
      let dirY: number;
      if (distCells > 0) {
        dirX = dx / distCells;
        dirY = dy / distCells;
      } else {
        dirX = 1;
        dirY = 0;
      }

      const pushX = dirX * strength * maxDisplacement;
      const pushY = dirY * strength * maxDisplacement;

      ctx.setOffset(ref.layerId, ref.entityId, pushX, pushY);
    }
  });

  return cancel;
}
