import type { Cell, Entity } from "./scene.ts";

/**
 * Background-generator contract.
 *
 * A `BackgroundGenerator` is a pure function that takes a typed `Config` plus
 * the geometry of the target layer, and emits the cells + entities that
 * populate it. The scene author composes the result into a real `Layer`
 * (assigning id, zIndex, opacity, visible). The generator is **never**
 * responsible for layer ordering or stacking concerns.
 *
 * Properties (load-bearing — see ADR 0013):
 *  - **Pure.** No DOM, no I/O, no `Math.random()` without a seed in `Config`.
 *    Generators must run in Node, in browsers, and in Workers.
 *  - **Sync.** v0.2 generators run at scene-build time. Async variants
 *    (heavy procedural noise, off-thread model inference) are deferred to a
 *    later milestone with a separate `AsyncBackgroundGenerator` type.
 *  - **Generic over `Config`.** Each concrete generator declares its own
 *    `Config` type. The future LLM-bridge (v0.3+) consumes a Zod schema per
 *    generator to validate model output before calling the function.
 *
 * Generators may emit `cells`, `entities`, or both. A static halftone fill is
 * cells-only; a rotating sunburst overlay on a static halftone is cells +
 * entities; a pure-particle field is entities-only. The output shape covers
 * all three uniformly.
 */
export type BackgroundGenerator<Config> = (
  config: Config,
  geometry: GeneratorGeometry,
) => GeneratorOutput;

/**
 * Geometry passed to a generator. `width` and `height` are in CELL units
 * (matching `Layer.width` / `Layer.height`); `cellSize` is in pixels.
 *
 * The generator uses these to size its output to the target layer. A
 * generator that fills the screen, for example, emits `width × height` cells.
 */
export type GeneratorGeometry = {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
};

/**
 * The result of running a generator. The scene author composes this into a
 * full `Layer` by adding the layer-level fields (`id`, `zIndex`, `opacity`,
 * `visible`).
 */
export type GeneratorOutput = {
  readonly cells: Cell[];
  readonly entities: Entity[];
};
