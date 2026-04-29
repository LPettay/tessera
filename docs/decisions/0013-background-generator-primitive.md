# ADR 0013: `BackgroundGenerator` primitive

## Status

Accepted — 2026-04-29

## Context

v0.1 shipped one entity-based "sunburst" that rotated in place — a single shape on a black background. User feedback was unambiguous: they wanted "the whole screen to be voxels" with a "voxel-generated real-time sunburst spinning background to go with the coffee theme." The framework had no primitive for *scene-fill content* — only `Entity` (positioned, animatable shapes) and the rarely-used `Layer.cells` (static decoration).

The need is concrete: hand-crafted templates that produce full-layer fills, parameterized by typed `Config`, picked and configured by an LLM in a future milestone. Same wedge as MotionPitch — craft is human, selection + parameterization is AI — applied to background fill.

## Decision

Add a primitive in `src/core/generator.ts`:

```ts
export type BackgroundGenerator<Config> = (
  config: Config,
  geometry: GeneratorGeometry,
) => GeneratorOutput;

export type GeneratorGeometry = {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
};

export type GeneratorOutput = {
  readonly cells: Cell[];
  readonly entities: Entity[];
};
```

Generator properties (load-bearing):

- **Pure.** No DOM, no I/O, no `Math.random()` without a seed in `Config`. Runnable in Node, browsers, and Workers.
- **Sync.** v0.2 generators run at scene-build time.
- **Decoupled from Layer composition.** The generator returns *just* the cells + entities. The scene author composes that into a `Layer` with their own `id`, `zIndex`, `opacity`, `visible`.
- **Generic over `Config`.** Each concrete generator declares its own `Config` type. The future LLM bridge consumes a Zod schema per generator to validate model output before calling the function.

The primitive ships alone in PR #7. Concrete generators (sunburst, halftone) ship in subsequent PRs. The LLM bridge is deferred to v0.3.

## Consequences

- **Pro:** Generators are small, pure functions — trivially testable, swappable, composable. A scene author can mix outputs from multiple generators into one `Layer`.
- **Pro:** "Pure + sync" makes the future LLM bridge straightforward: validate JSON against Zod schema, call `generator(config, geometry)`, get output.
- **Pro:** Decoupled-from-Layer-composition keeps presentation concerns (zIndex, opacity) visible to the scene author rather than hidden inside the template.
- **Con:** Two-step pattern (call generator → wrap in Layer) is slightly more verbose than `createBackgroundLayer(...)`. Acceptable; the verbosity surfaces layer-level concerns where they belong.
- **Con:** Generic `Config` doesn't enforce a runtime schema by itself. Each generator must export a Zod schema separately for LLM validation. Acceptable — types and runtime schemas are different concerns and TS doesn't bridge them.

## Alternatives considered

- **Generator returns a full `Layer`.** Forces the template to invent IDs and choose zIndex — scene-author concerns. Rejected.
- **Generator emits cells only (no entities).** Loses the ability to add motion (e.g., a static halftone fill plus a rotating ray overlay). Rejected.
- **Class-based generators with a `.generate()` method.** No advantage over a typed function; classes resist composition and add ceremony. Rejected; matches Tessera's data-first ethos.
- **Async generators by default.** Adds complexity for cases that don't need it. Sync now; an `AsyncBackgroundGenerator` type can land later when a real use case demands it (off-thread procedural noise, model inference).
- **Curried: `(config) => (geometry) => output`.** More "functional," but actual call sites always have both at once. Currying buys nothing here. Rejected.
- **Embed the LLM bridge in v0.2.** Crosses a model boundary and adds a runtime dependency to a primitive that should stay zero-dep. Deferred to v0.3 per the milestone firewall.
