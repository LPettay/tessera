import type { Scene } from "./scene.ts";

/**
 * The contract every renderer tier implements.
 *
 * Renderers own their animation loop. Userland mounts a renderer onto a
 * container and gets back a controller for pause / resume / setScene /
 * dispose. The page-citizenship layer (added in a later PR) wraps the
 * controller to react to IntersectionObserver, prefers-reduced-motion, and
 * battery hints.
 *
 * Rationale for renderer-owns-loop: ADR 0008.
 */
export type Renderer = {
  /** Static metadata describing this renderer's capabilities. */
  readonly capabilities: RendererCapabilities;
  /**
   * Mount the renderer onto a container element with an initial Scene.
   * The renderer starts running immediately; userland may call
   * `controller.pause()` to halt the loop.
   */
  mount(container: HTMLElement, scene: Scene): RendererController;
};

/**
 * Static metadata about a renderer tier. Used by the auto-selector to
 * decide whether a tier can render a given scene at acceptable performance.
 */
export type RendererCapabilities = {
  tier: RendererTier;
  /**
   * Soft ceiling for cells per layer. Going over isn't fatal but performance
   * degrades; the auto-selector escalates to a higher tier when exceeded.
   */
  maxCellsPerLayer: number;
  /** Whether this tier can simulate particles. v0.1 SVG: false. WebGL2+: true. */
  particles: boolean;
};

/** Renderer tier identifier. */
export type RendererTier = "svg" | "canvas2d" | "webgl2" | "webgpu";

/**
 * Runtime control of a mounted renderer. Returned from `Renderer.mount()`.
 *
 * `pause()` halts the animation loop; `resume()` restarts it. `setScene()`
 * hot-swaps the scene without remounting (the renderer diffs and updates).
 * `dispose()` tears down listeners, removes DOM nodes, and frees GPU
 * resources. After `dispose()`, the controller must not be reused.
 *
 * `onFrame` and `setCursor` form the L4 imperative interactivity surface
 * (ADR 0024). Use them to drive per-frame entity displacement (cursor
 * fields, physics-y reactivity). Declared `Animation` kinds compose
 * additively with frame offsets — both can be active on the same entity.
 */
export type RendererController = {
  pause(): void;
  resume(): void;
  /** True between mount and dispose, regardless of paused state. */
  readonly mounted: boolean;
  /** True when paused. */
  readonly paused: boolean;
  /** Hot-swap the scene. Must not be called after dispose. */
  setScene(scene: Scene): void;
  /**
   * Register a per-frame callback invoked just before the renderer
   * commits transforms each tick. Returns a cancel function. Multiple
   * callbacks compose in registration order.
   *
   * The renderer keeps the RAF loop alive whenever at least one
   * callback is registered (even with no animated entities), so a
   * scene with only static cells can still react to the cursor.
   */
  onFrame(callback: FrameCallback): () => void;
  /**
   * Override the cursor position read inside `FrameContext.cursor`.
   * `null` clears the override. Useful for headless tests, programmatic
   * drive, or projecting an external cursor source (e.g. a touch
   * gesture, an AI agent) into the scene.
   *
   * Coordinates are in renderer **viewBox space** — same units as
   * `cellSize × cell` coordinates. Userland converts to a specific
   * layer's cell space by dividing by that layer's `cellSize`.
   *
   * When set, the override wins over native `pointermove` for the next
   * frame. Subsequent native pointer events overwrite the override.
   */
  setCursor(cursor: { x: number; y: number } | null): void;
  dispose(): void;
};

/**
 * Per-frame callback invoked by the renderer just before it commits
 * transforms for the current tick. Userland uses `ctx.setOffset` to
 * displace entities; the displacements compose additively with any
 * declared `Animation` and reset to `(0, 0)` every frame.
 */
export type FrameCallback = (ctx: FrameContext) => void;

/**
 * Context passed to each `FrameCallback`. Coordinates are in renderer
 * viewBox space (cursor) or layer cell space (`setOffset`); see field
 * docs.
 */
export type FrameContext = {
  /** ms since the most recent `mount()` or `setScene()`. */
  elapsed: number;
  /** ms since the previous frame; ~16.7 at 60fps. */
  dt: number;
  /**
   * Cursor position in renderer viewBox coordinates (= `cellSize × cell`
   * for any layer with that `cellSize`). `null` when no pointer is over
   * the renderer container and `setCursor` has not been called.
   *
   * To convert to a specific layer's cell space:
   * `cell.x = cursor.x / layer.cellSize`.
   */
  cursor: { x: number; y: number } | null;
  /**
   * Set this frame's translation offset for an entity, in **cell units
   * of the entity's parent layer**. The offset is additive on top of
   * any declared `Animation` transform.
   *
   * Resets implicitly to `(0, 0)` on every frame — callers MUST call
   * `setOffset` every frame they want a displacement active. No-op if
   * the `(layerId, entityId)` pair is unknown.
   */
  setOffset(layerId: string, entityId: string, dx: number, dy: number): void;
};
