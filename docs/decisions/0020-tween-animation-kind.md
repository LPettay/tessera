# ADR 0020 — `tween` Animation Kind

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The existing animation kinds cover rotation (`oscillate`, `spin`), scale (`pulse`), vertical
translate (`bob`), opacity (`fade`), and unbounded translate (`drift`). One gap remained:
**bounded translation with an explicit target** — fly an entity from its resting position to a
specified offset, then optionally back. `drift` is unbounded and has no natural endpoint.

The motivating use case was a "voxel breakapart" demo: rasterize "TESSERA" to individual
glyph-pixel cells, lift each cell into its own Entity, animate every cell outward from the text
centroid and back, forever — demonstrating that Tessera works with composable cell primitives,
not static bitmaps.

Secondary use cases: slide-in panels, bounce arrivals, one-shot translations between two
positions.

## Decision

Add `TweenAnimation` to the `Animation` union:

```ts
type TweenAnimation = {
  kind: "tween";
  dx: number;             // target X displacement from entity.position in cells
  dy: number;             // target Y displacement
  durationMs: number;     // duration of one trip (forward, or backward on yoyo)
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";  // default ease-in-out
  yoyo?: boolean;         // reverse on alternate iterations; one repeat = out + back
  repeat: number | "infinite";
};
```

**Semantics:**

- One "repeat" unit = one full cycle: forward trip (0 → durationMs) for non-yoyo, or forward +
  backward (0 → 2×durationMs) for yoyo.
- `periodLimitFor` returns `repeat` for `tween` (same as oscillate-family).
- `isPeriodComplete`: `elapsed / cycleDuration >= periodLimit` where
  `cycleDuration = (yoyo ? 2 : 1) * durationMs`.
- `applyNeutral`: yoyo → reset to baseTransform; non-yoyo → hold at final offset.

**Easing functions:** cubic (`ease-in`: t³, `ease-out`: 1−(1−t)³, `ease-in-out`: standard
cubic-in-out). `linear` is available but produces mechanical motion; the default `ease-in-out`
is the right choice for organic explode/reform effects.

**Renderer path:** SVG renderer applies `translate(dx×t×cellSize px, dy×t×cellSize px)` on top
of `baseTransform` — identical approach to `drift` and `bob`, so no new DOM infrastructure was
needed.

## Breakapart demo (`examples/breakapart-svg/`)

`rasterizeText` is now re-exported from `src/index.ts` (with `measureText`, `FONT_WIDTH`,
`FONT_HEIGHT`) so scene authors can decompose text into per-cell entities without reaching into
core internals.

The demo:

1. Calls `rasterizeText({ kind: "text", text: "TESSERA", fill: GOLD, scale: 1.5 })` to get
   ~90 `VoxelSpriteCell` entries.
2. Converts each cell to a standalone Entity positioned at `ORIGIN + cell.xy`.
3. Assigns each entity a `tween` with radially outward `(dx, dy)`, `yoyo: true`,
   `repeat: "infinite"`, and a deterministically jittered `durationMs` (700–1100 ms).
4. Duration jitter desynchronises cells over 2-3 cycles, turning one synchronized burst into a
   fluid shimmering wave.

## Alternatives considered

**CSS keyframes per cell.** The SVG renderer could inject `<style>` blocks with per-entity
keyframe animations. Rejected: frame-accurate control is lost; composing with other animation
kinds becomes impossible; the existing RAF loop is already accurate and efficient enough for
~90 entities.

**`sequence` kind (chain multiple animations).** The right long-term primitive for "fly out,
hold, fly back with different easings". Deferred: needs a richer composition model. `tween` with
`yoyo` covers the primary use case today.

**`phaseOffsetMs` field.** Would let scene authors stagger cells from t=0. Deferred: the
composition ADR is the right home for phase/delay primitives. Duration jitter achieves adequate
visual stagger with zero new API surface.

## Consequences

- All six existing examples continue to work; they do not use `tween`.
- `Animation` union gains a new branch — every exhaustive switch in the codebase needed a new
  case. All were updated: `applyVoxelAnimation`, `applyVectorAnimation`, `applyNeutral`,
  `periodLimitFor`, `isPeriodComplete`.
- `rasterizeText`, `measureText`, `FONT_WIDTH`, `FONT_HEIGHT` graduate from internal to public
  API. Scene authors can now use them for programmatic cell decomposition without coupling to
  internal paths.
