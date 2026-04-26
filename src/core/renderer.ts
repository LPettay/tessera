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
  dispose(): void;
};
