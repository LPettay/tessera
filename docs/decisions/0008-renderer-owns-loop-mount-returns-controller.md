# ADR 0008: Renderer owns the animation loop; mount returns a controller

## Status

Accepted — 2026-04-25

## Context

Two patterns were considered for renderer/engine separation in v0.1:

- **Pattern A — Engine owns the loop:** the engine calls `renderer.draw(scene)` every frame via a single global RAF.
- **Pattern B — Renderer owns the loop:** each renderer manages its own animation loop and exposes start/stop/dispose.

Pattern A is more "principled" for ECS-style separation. Pattern B is what actually fits the renderer tiers we're shipping:

- **Tier 1 (SVG with Framer Motion)** — Framer Motion already manages its own animation loop per `motion.*` element. Driving it from an external `draw(scene)` call fights the library; embracing it means the SVG renderer's "loop" is just letting Framer Motion run.
- **Tier 3 (WebGL2)** — wants direct `requestAnimationFrame` to align frame boundaries with GPU buffer swaps and minimize input latency.
- **Tier 4 (WebGPU)** — compute-shader dispatch wants explicit control of when the GPU clock advances; an external `draw(scene)` would invert this control.

The page-citizenship layer (added in a later PR) needs to pause/resume the renderer in response to IntersectionObserver / prefers-reduced-motion / battery saver. With Pattern B, "pause" is `renderer.pause()`; with Pattern A, the engine has to stop calling `draw()` and somehow communicate this to the renderer (which may have its own outstanding animations).

## Decision

Renderers own their animation loop. The engine owns the scene description (pure data) and, later, the page-citizenship layer (which wraps controllers). `Renderer.mount()` returns a `RendererController`:

```ts
type Renderer = {
  capabilities: RendererCapabilities;
  mount(container: HTMLElement, scene: Scene): RendererController;
};

type RendererController = {
  pause(): void;
  resume(): void;
  setScene(scene: Scene): void;
  dispose(): void;
  readonly mounted: boolean;
  readonly paused: boolean;
};
```

The controller is the userland handle to a running renderer. Pause / resume are explicit, scene hot-swap is explicit, dispose is explicit. The page-citizenship layer wraps this controller and calls these methods in response to environmental signals.

## Consequences

- **Pro:** Each renderer tier uses its native animation loop (Framer Motion for SVG, RAF for Canvas2D/WebGL2, compute dispatch for WebGPU). No fighting the library.
- **Pro:** Pause / resume / dispose are single method calls on a single controller — userland gets one object per scene mount.
- **Pro:** Hot-swapping scenes (`controller.setScene(next)`) lets a single mount handle a stream of updates without teardown/remount.
- **Pro:** Mirrors the React effect-cleanup pattern: `mount()` → `dispose()` is `useEffect(() => mount(), [])` → cleanup function.
- **Con:** Multiple controllers on the same page each have their own loop; there is no shared scheduler. For a page with one Tessera scene this is irrelevant; for pages with many scenes a future shared-scheduler optimization could route all renderers through a single tick. Not needed for v0.1.

## Alternatives considered

- **Pattern A — engine owns the loop, renderers are dumb draw-on-demand** — fights Framer Motion (Tier 1) and WebGPU compute dispatch (Tier 4). Rejected.
- **No controller; mount returns void; cleanup via DOM teardown** — loses pause/resume/setScene as explicit operations and forces userland to unmount/remount for what should be live updates. Rejected.
- **Class-based Renderer with inherited methods** — fine, but a plain object literal is more idiomatic for a TS-first API and easier to mock in tests. Rejected as the v0.1 default; subclassable Renderer base class can land later if a real need emerges.
