/**
 * Scene fragments + `composeScene` — Layer **L2** in the abstraction
 * stack from ADR 0021.
 *
 * A `SceneFragment` is just `Layer[]`. A "component" is any function
 * that returns a `SceneFragment`. `composeScene` merges multiple
 * fragments into a single `Scene` by **layer id**:
 *
 *   - Layers with the same id are **merged**: `cells` and `entities`
 *     concatenate, layer-level config (cellSize, width, height,
 *     zIndex, opacity, visible) is taken from the first occurrence
 *     and subsequent declarations are ignored.
 *   - Layers with unique ids appear in insertion order.
 *
 * "First wins" on layer config means components SHOULD agree on layer
 * setup for any layer id they share — typically by adopting a small
 * vocabulary of conventional ids (`"ui-chrome"`, `"ui-text"`,
 * `"background"`) with known cellSize / zIndex per project.
 *
 * See ADR 0023.
 */

import type { Cell, Layer, Scene } from "./scene.ts";

/**
 * Fragment shape returned by components — a flat list of layers.
 *
 * Components own their layer ids and SHOULD use stable, conventional
 * names so they merge predictably with sibling fragments.
 */
export type SceneFragment = Layer[];

/**
 * Merge any number of `SceneFragment`s into a single `Scene`. Same-id
 * layers concatenate cells/entities; unique ids appear in insertion
 * order; layer config follows first-wins.
 *
 * Empty input yields `{ layers: [] }`.
 */
export function composeScene(...fragments: SceneFragment[]): Scene {
  const byId = new Map<string, Layer>();

  for (const fragment of fragments) {
    for (const layer of fragment) {
      const existing = byId.get(layer.id);
      if (existing) {
        byId.set(layer.id, {
          ...existing,
          cells: mergeCells(existing.cells, layer.cells),
          entities: [...existing.entities, ...layer.entities],
        });
      } else {
        byId.set(layer.id, layer);
      }
    }
  }

  return { layers: [...byId.values()] };
}

function mergeCells(a: Cell[] | undefined, b: Cell[] | undefined): Cell[] | undefined {
  if (!a && !b) return undefined;
  return [...(a ?? []), ...(b ?? [])];
}
