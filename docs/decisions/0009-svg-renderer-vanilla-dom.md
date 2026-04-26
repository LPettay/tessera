# ADR 0009: SVG renderer is vanilla DOM + RAF (no animation library)

## Status

Accepted — 2026-04-25

## Context

Tier 1 (SVG) is the v0.1 renderer. It has to:

- Render a 2D voxel scene as `<rect>` elements under a single `<svg>`.
- Drive a Y-axis oscillation animation on a single dynamic entity (the MotionPitch coffee mug).
- Pause/resume on demand (so the page-citizenship layer in a later PR can react to IntersectionObserver and `prefers-reduced-motion`).

ADR 0008 anticipated `framer-motion` ("Tier 1 SVG with Framer Motion … driving it from an external `draw(scene)` call fights the library"). That was a forecast, not a commitment. When it came time to implement, `framer-motion` would have been the only runtime dependency in the entire framework, costing a non-trivial bundle and pulling React-flavored animation primitives into a renderer that has no other reason to know React exists.

The animation surface in v0.1 is one shape: `oscillate` with `axis: "y"`, parameterised by `degrees`, `durationMs`, and `repeat`. That is a single `Math.sin` call and a `requestAnimationFrame` loop.

## Decision

The SVG renderer ships with **zero runtime dependencies**. All animation is driven by `requestAnimationFrame` and a single closed-form sine. The `Renderer` and `RendererController` contracts from `src/core/renderer.ts` are implemented with vanilla DOM APIs (`document.createElementNS`, `style.transform`, `transformOrigin`, `transformBox`).

The published capabilities for v0.1:

| Field | Value |
|---|---|
| `tier` | `"svg"` |
| `maxCellsPerLayer` | `500` |
| `particles` | `false` |

Animation support in v0.1:

- `oscillate` with `axis: "y"` — implemented via `rotate3d(0, 1, 0, ...)` composed with a `translate(...)` derived from the entity's cell position.
- `oscillate` with `axis: "x"` or `axis: "z"` — accepted at the type level (since `core/scene.ts` defines them) but rendered as no-ops. They land when a real use case arrives.

The `setScene(next)` contract for v0.1 tears down all child elements under the `<svg>` and rebuilds. Real diffing (key-stable element reuse) is a post-v0.1 optimisation — it costs implementation complexity that no v0.1 user feels yet.

## Consequences

- **Pro:** Zero runtime deps in the entire framework — `package.json` `dependencies` stays `{}`. The marketing claim ("the same scene description from a 30-rect SVG hero up to a million-particle WebGL2 sim") is now also a "no extra weight on your page" claim.
- **Pro:** The renderer is small (~200 lines) and trivially auditable. Reviewers can read the whole tier in one sitting.
- **Pro:** No version coupling to a third-party animation library. Future renderer tiers can pick their own runtime story (Canvas2D might use `motion-one` if interpolators get unwieldy; WebGL2 has its own loop) without dragging Tier 1 along.
- **Con:** When we add more `Animation` kinds (`translate`, `fade`, `sequence`, `keyframes` in later milestones), the interpolator code grows here. If it grows past ~100 LOC of math without conceptual gain, that's the cue to revisit and either lift interpolators into `src/core/` or adopt a small library. We re-evaluate at the v0.2 milestone, not before.
- **Con:** `setScene` is a full rebuild, so streaming-scene use cases pay the rebuild cost on every update. v0.1 has no such use cases; the cost is invisible until someone hits it, at which point a diffing strategy lands behind the same `setScene` API.

## Alternatives considered

- **`framer-motion`** — what ADR 0008 forecast. Brings ~30KB gzipped of code we don't need, plus React-flavored ergonomics in a non-React file. Rejected.
- **`motion-one`** — smaller (~3KB) and framework-agnostic. Genuine option, but adding any dep to the v0.1 SVG tier is a one-way door we shouldn't open before measuring it's actually needed. Re-evaluate when the interpolator surface grows.
- **CSS keyframes via `animate()` (Web Animations API)** — works for fixed durations but awkward for the "compose translate-then-rotate per frame" pattern when the rotation pivot is a non-trivial pixel coordinate inside a `viewBox`. RAF is simpler and more direct.
- **Diffing `setScene` in v0.1** — implementation complexity (key tracking, attribute reconciliation) that nobody in v0.1 needs. Rejected as scope creep; the contract permits adding diffing later without changing the API.
