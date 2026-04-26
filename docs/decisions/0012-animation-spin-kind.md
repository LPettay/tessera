# ADR 0012: Extend `Animation` with a `spin` kind

## Status

Accepted — 2026-04-25

## Context

v0.1 originally shipped one `Animation` kind: `oscillate` (sine-eased back-and-forth rotation, the MotionPitch mug pattern). Building the v0.1 demo surfaced the gap immediately:

- A "voxel-takes-over-the-screen" demo wants a slowly-rotating sunburst background.
- A sunburst rotating sinusoidally (oscillate with high amplitude) reverses direction and stutters mathematically — it never makes a full clean revolution.
- The natural primitive is **continuous rotation at a constant rate**, which is a different beast from oscillate (sine-eased, bounded amplitude) and warrants a distinct kind rather than a flag on the existing one.

Without a continuous-rotation primitive, every rotating background, loading spinner, or rotating-logo demo would either fake it badly with oscillate or punt to a future milestone.

## Decision

Extend the `Animation` tagged union with a new `spin` kind:

```ts
export type Animation = OscillateAnimation | SpinAnimation;

export type SpinAnimation = {
  kind: "spin";
  axis: "x" | "y" | "z";
  durationMs: number;             // ms per full revolution
  direction: "cw" | "ccw";
  repeat?: number | "infinite";   // defaults to "infinite"
};
```

The SVG renderer (Tier 1) animates `axis: "z"` only — in-plane rotation via CSS `transform: rotate(<angle>deg)`. Other axes are reserved at the type level and no-op in the SVG tier; higher tiers may implement them.

`repeat` is **optional** on `SpinAnimation` (defaulting to infinite) because the canonical spin use case is a background that just runs. `OscillateAnimation.repeat` stays required because oscillating a fixed number of times is a common animation idiom (a quick attention-getting bounce, for example).

The `extractExportNames` API-surface check sees only top-level export names, not type-shape changes. So this change does **not** trip `check-api-surface`. It still requires this ADR per ADR 0007's rule that "any change to the public surface" is gated by a decision record — even when the check can't catch it.

## Consequences

- **Pro:** v0.1 demos can show real rotating backgrounds, loading indicators, and any other constant-rate rotation. The coffee-shop scene becomes the regression test for both `Animation` kinds simultaneously.
- **Pro:** The SVG renderer code path is symmetric — `applyAnimation` switches on `kind` and dispatches to `applyOscillate` or `applySpin`. Easy to extend with future kinds (`translate`, `fade`).
- **Pro:** Additive change — existing `oscillate` consumers compile and run unchanged.
- **Con:** Exhaustive consumer code that switches on `animation.kind` now needs a `spin` branch. This is the cost of adding a tagged-union variant and is the right shape (TypeScript's exhaustiveness checking will catch missing branches). Mitigated by the ADR being public.
- **Con:** The optional-vs-required `repeat` asymmetry between `oscillate` (required) and `spin` (optional) is a minor language inconsistency. We chose use-case fit over API symmetry.

## Alternatives considered

- **Extend `oscillate` with a `mode: "oscillate" | "spin"` flag.** Conflates two mathematically different animations under one name; the data shapes diverge anyway (`degrees` is meaningless for spin, `direction` is meaningless for oscillate). Rejected.
- **Use `oscillate` with amplitude `360°` and a triangle-wave easing.** Linear traversal of 0→360→0 isn't continuous either; the velocity dips to zero at the endpoints. The math doesn't fit the use case. Rejected.
- **Defer `spin` to v0.2.** Means no compelling v0.1 demo — the sunburst was the demo direction Lance asked for. Rejected.
- **Make `axis: "z"` only on `SpinAnimation`.** Tighter, but mirrors `OscillateAnimation`'s `axis: "x" | "y" | "z"` pattern less naturally. The extra union members let higher tiers implement them later without breaking the type. Kept the wider union.
