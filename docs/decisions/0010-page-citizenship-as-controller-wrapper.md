# ADR 0010: Page-citizenship as a `RendererController` wrapper function

## Status

Accepted — 2026-04-25

## Context

ADR 0005 commits the framework to a renderer-agnostic page-citizenship layer
(IntersectionObserver pause, `prefers-reduced-motion`, hidden-tab pause) that
sits above every renderer tier. ADR 0008 commits to renderers owning their
animation loop and exposing pause/resume via a `RendererController`.

We needed to choose how page-citizenship attaches to a controller. Three
shapes were on the table:

1. A wrapper function — `withPageCitizenship(inner, container)` returns a new
   controller that delegates to `inner`.
2. A mount-time option — `renderer.mount(container, scene, { pageCitizen: true })`
   bakes the behavior into each renderer.
3. A base class — every renderer extends a `PageCitizenRenderer` that owns
   the listeners and calls hooks the subclass implements.

There is also a creative-direction question: when the user has set
`prefers-reduced-motion: reduce`, calling `controller.resume()` from
application code should NOT override their OS preference. The pause must be
"sticky" against caller-side resume and only clear when the OS-level
preference itself flips back.

## Decision

**Wrapper function.** `withPageCitizenship(inner, container)` returns a new
`RendererController` that delegates `setScene` to `inner`, owns the DOM
listeners, and tracks four boolean signals:

- `userPaused` — toggled by the wrapper's own `pause()` / `resume()`.
- `offscreen` — driven by an `IntersectionObserver` on `container` (threshold 0).
- `hidden` — driven by `document.hidden` and `visibilitychange`.
- `reducedMotion` — driven by `matchMedia('(prefers-reduced-motion: reduce)')`.

The combined paused state is the OR of all four:

```
shouldBePaused = userPaused || offscreen || hidden || reducedMotion
```

When any signal changes, the wrapper recomputes `shouldBePaused`. If it
transitioned `false → true`, it calls `inner.pause()`. If `true → false`,
`inner.resume()`. Redundant transitions are suppressed — the inner controller
sees one call per real edge, not one per signal.

`dispose()` disconnects the observer, removes both listeners, calls
`inner.dispose()`, and is idempotent.

**Sticky reduced-motion.** The wrapper's `resume()` only clears the
`userPaused` flag. It does not clear `reducedMotion`. If the user has
`prefers-reduced-motion: reduce` set at the OS level, `resume()` is a no-op
until the OS preference flips and the `MediaQueryList` `change` handler fires.
This is intentional: an application overriding an accessibility setting it
does not own would be a bug.

**Lives in `src/core/`.** Even though the file uses DOM APIs at runtime, it
is renderer-agnostic and the alternative is duplicating the logic in every
renderer tier (SVG, Canvas2D, WebGL2, future WebGPU). `src/core/AGENTS.md`
forbids DOM assumptions in *types* — the scene model must remain transferable
to a Worker — but a runtime helper that takes an `HTMLElement` and uses
browser APIs is the same kind of code as the existing `Renderer.mount()`
contract, which also takes `HTMLElement`. The constraint is "core's data
model is DOM-agnostic," not "no file in core may touch the DOM."

## Consequences

- **Pro:** Composable. The MotionPitch port and any later renderer tier opts
  in by wrapping its own controller; tiers that don't need it (tests, Node
  rendering, future server-side prerender) skip it.
- **Pro:** No coupling between renderer tiers. Each tier still implements the
  same `Renderer` / `RendererController` contract; page-citizenship is a
  separate concern that layers above.
- **Pro:** Single place to fix bugs / add signals. When battery / data-saver
  signals land, they extend this one file rather than every renderer.
- **Pro:** Trivially testable — pass a fake `RendererController` and a fake
  `HTMLElement`, drive the signals, assert pause/resume calls.
- **Con:** Userland has to remember to wrap. A future `mount()` auto-selector
  (ADR 0005) can do the wrapping by default so the common case is one call.
- **Con:** Sticky reduced-motion is a surprise if you don't read this ADR.
  Documented in the source comment on `resume()` for the reader who only
  reads the code.

## Alternatives considered

- **Mount-time option** — `renderer.mount(container, scene, { pageCitizen: true })`.
  Forces every renderer to know about page-citizenship and re-implement the
  signal wiring. Rejected — duplicates logic and couples concerns.
- **Base class inheritance** — `class PageCitizenRenderer extends Renderer`.
  Forces every renderer into a class shape we explicitly avoided in ADR 0008
  ("plain object literal is more idiomatic for a TS-first API"). Rejected.
- **Sticky-resume off (caller's `resume()` overrides reduced-motion)** —
  simpler API, but the framework would silently override an OS accessibility
  preference. Rejected on principle.
