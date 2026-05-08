# AGENTS.md — `src/renderers/svg/`

Tier 1 renderer. SVG output, vanilla DOM, `requestAnimationFrame`-driven. The first renderer to ship; the v0.1 milestone target.

## Index

### Files here

| File | Purpose |
|---|---|
| `svg-renderer.ts` | The `svgRenderer` implementation — builds an `<svg>` tree from a `Scene`, runs the animation loop, dispatches `onFrame` callbacks, and applies per-frame entity offsets (ADR 0024). |
| `svg-helpers.ts` | Pure helpers (rect builders, oscillation math, viewBox sizing, centroid). Split out so `svg-renderer.ts` stays under the per-file size budget. |
| `index.ts` | Single re-export of `svgRenderer`. |

## Rules

- **Vanilla DOM only.** No `framer-motion`, no `motion-one`, no animation library. Plain `document.createElementNS` + `requestAnimationFrame`. ADR 0009 explains why.
- **Zero runtime dependencies for this renderer.** If you ever need a library, write an ADR first.
- **Depend only on `src/core/`.** Do not import from `canvas2d/`, `webgl2/`, or any sibling renderer.
- **Capability ceiling: 500 cells per layer, no particles.** This is the published `capabilities` value; do not raise it without measuring.
- **`setScene` rebuilds, not diffs.** v0.1 tears down child elements and rebuilds. Real diffing is a post-v0.1 optimization.
- **Animation support covers the full v0.2 union** — `oscillate` (y-axis only), `spin` (z-axis only), `pulse`, `bob`, `fade`, `drift`, `tween`. `oscillate.axis = "x"`/`"z"` and `spin.axis = "x"`/`"y"` are type-reserved but render as no-ops in v0.1. Higher tiers may implement them later.
- **Per-frame callbacks compose additively with declared animations** (ADR 0024). The tick runs callbacks → animations → offset application in three phases; offsets translate on top of any animation transform.

## What does NOT live here

- Page-citizenship logic (IntersectionObserver, prefers-reduced-motion) → `src/core/page-citizenship.ts` when it lands. The renderer exposes pause/resume; page-citizenship calls them.
- Auto-tier selection → `src/core/mount.ts` when it lands.
- React glue → `src/adapters/react/` (post-v0.1).

---

<!-- last-reviewed: 99be9bf -->
