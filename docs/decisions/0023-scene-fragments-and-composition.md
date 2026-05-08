# ADR 0023 — Scene fragments + `composeScene` (L2)

**Status:** Accepted
**Date:** 2026-05-08

## Context

ADR 0021 names L2 in the abstraction stack as "fragments — components return groupings of cells/entities." Today every demo composes its scene as one hand-built `Scene` literal. That works for one-off scenes but doesn't scale to the Windows-replica demo, which will compose many independent components (taskbar, windows, desktop icons, start menu) into a shared scene.

This ADR adds the smallest L2 surface that lets components be authored independently and merged at the scene boundary.

## Decision

A new module `src/core/compose.ts` exports:

```ts
export type SceneFragment = Layer[];

export function composeScene(...fragments: SceneFragment[]): Scene;
```

Both names are added to the public API.

A **component** is any function returning a `SceneFragment`. `composeScene` merges fragments into a single `Scene` by **layer id**:

- **Same id → merge.** `cells` and `entities` concatenate.
- **Same id → first wins on layer config.** `cellSize`, `width`, `height`, `zIndex`, `opacity`, `visible` are taken from the first occurrence; subsequent declarations of the same id are silently ignored for these fields.
- **Unique id → appended.** Layers appear in `composeScene`'s output in insertion order.

```ts
const scene = composeScene(
  background({ width: 100, height: 60 }),
  taskbar({ y: 56 }),
  windowComponent({ id: "win-1", x: 10, y: 8, w: 40, h: 30, title: "NOTEPAD" }),
  windowComponent({ id: "win-2", x: 30, y: 16, w: 40, h: 30, title: "CALC" }),
);
```

Each component owns its layer ids and contributes whatever cells/entities it needs to those layers. The scene author wires components together; the framework handles the merge.

## Design notes

### Why `Layer[]` and not `{ layers: Layer[] }`

Two reasons. **Composition reads naturally with rest args** — `composeScene(a, b, c)` matches how authors think about the operation. **Wrapping objects pay no rent today** — there's no other field a fragment would carry that doesn't also belong on a Layer (entities, cells, config). If we ever need scene-level decoration (cursors, audio bus, fields), it can land on `Scene` directly or via a parallel composer; `SceneFragment` doesn't need to anticipate it.

### Why "first wins" on layer config

Components contributing to a shared layer (e.g., `"ui-chrome"`) MUST agree on its `cellSize` — cells are positioned in cell-space, and a mismatched `cellSize` would render content at the wrong pixel coordinates. "First wins" makes the convention explicit: the first fragment that names a layer establishes its config. Subsequent fragments only contribute content.

This is enforced by convention, not by the type system. A future ADR could add a runtime check (warn or throw on config disagreement) if it bites; not needed for v0.1.

"Last wins" was rejected — component order would silently flip the meaning of layer config in unintuitive ways. "Strict mode that rejects all duplicates" was also rejected — components MUST be able to share layers, that's the whole point.

### Entity id collisions

Per the existing data model (`scene.ts`), `Entity.id` is unique within a `Layer`. Components don't know about each other, so two `windowComponent` calls would naively produce duplicate entity ids inside a shared layer.

**Convention:** components accept an `id` parameter (or similar prefix) and stamp it onto every entity they emit. `windowComponent({ id: "win-1", ... })` produces entity ids like `"win-1.title"`, `"win-1.close-btn"`, etc. This is userland responsibility; `composeScene` does not check.

A runtime collision warning is a future ADR if the footgun manifests. The cost of validating in core (every Entity scanned every compose) is non-trivial for the Windows-replica demo's ~10k+ entities.

## Alternatives considered

**Components return `{ layers, entities, cells }` patches** that target existing layers by id. Rejected. Two ways to express "I'm contributing to a layer" (define a partial Layer, or emit a typed Patch) creates ambiguity. One way: components return Layers; same-id Layers merge.

**Mix `Scene` and `SceneFragment` in `composeScene` args** (`composeScene(scene, ...fragments)`). Rejected. `Scene` is a complete output; `SceneFragment` is an input. Mixing them would require unwrapping one at compose time, a tiny convenience that doesn't justify the type-union complexity.

**Define components as a class with a `compose()` method.** Rejected. Components are functions; the data model is plain objects. A class hierarchy would couple components to a specific call shape and make sharing across projects harder.

**Builder API** (`scene().withLayer(...).withWindow(...).build()`). Rejected. More API surface for no expressive gain over `composeScene(...)`.

**Layout helpers (hstack/vstack/grid) in this PR.** Rejected. Layout is L3, separate from L2 composition. Layouts rearrange fragments in cell-space; composition merges them into a scene. Different decisions. Layouts land in a follow-up ADR if patterns emerge.

## Consequences

- **Public API gains `composeScene` (function) and `SceneFragment` (type).** Listed in `docs/api-surface.txt`.
- **Existing scenes do not change.** `composeScene` is additive; no demo is rewritten in this PR.
- **The Windows-replica demo becomes feasible.** A `Window` component, a `Taskbar` component, a `DesktopIcon` component each return a `SceneFragment`; the demo's top-level scene file just calls `composeScene(...)` over them.
- **Layer-id discipline emerges.** Demos that use composition will adopt a small vocabulary of layer ids (`"background"`, `"ui-chrome"`, `"ui-content"`, etc.). This is a userland convention, not a framework rule.
- **No runtime cost for non-users.** Existing scenes that don't call `composeScene` pay nothing.

## What this doesn't decide

- Layout helpers — `hstack`, `vstack`, `grid` over fragments (TBD)
- Theme tokens / design system primitives (TBD)
- The `onFrame` interactivity hook (ADR 0024)
- The declarative `Field` system (ADR 0025)
- Component validation — entity-id collision detection, layer-config-disagreement warnings (TBD; not needed for v0.1)
- Conditional / dynamic composition (today: build the fragment list imperatively before calling `composeScene`)
