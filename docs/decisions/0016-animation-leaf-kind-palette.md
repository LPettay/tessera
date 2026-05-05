# ADR 0016: Expand `Animation` with non-rotation leaf kinds

## Status

Accepted — 2026-05-02

## Context

The `Animation` tagged union currently has two kinds, both rotation-based:

- `oscillate` — sine-eased back-and-forth rotation (ADR 0012, v0.1)
- `spin` — continuous rotation at a constant rate (ADR 0012)

A core goal of Tessera is to support highly animated, game-like UIs (think JRPG menus, rhythm-game HUDs, stylized title sequences) — surfaces where motion is the default, not the exception. Two rotation kinds are not sufficient for that vision. The obvious gaps surface immediately when you try to author a game-like menu:

- A button that **pulses** (rhythmic scale up/down) to draw attention.
- A character portrait or icon that **bobs** vertically to feel alive.
- An overlay that **fades** in/out (opacity oscillation or one-shot).
- A background element that **drifts** continuously across the layer (parallax stars, scrolling clouds).

Today every one of these has to be faked with `oscillate`/`spin` (which only animate rotation) or punted. This ADR fills the obvious gaps.

**Out of scope for this ADR** (each its own future decision):

- Composition: running multiple animations on one entity simultaneously (`parallel`) or in sequence (`sequence`). Today `Entity.animation` is `Animation | undefined`. Allowing multiple is a separate, more invasive change.
- A general keyframed `tween` kind (arbitrary `from → ... → to` curves with custom easing). Powerful but a larger surface; we want concrete leaf kinds first to learn what authors actually reach for.

## Decision

Add four leaf kinds to the `Animation` union:

```ts
export type Animation =
  | OscillateAnimation
  | SpinAnimation
  | PulseAnimation
  | BobAnimation
  | FadeAnimation
  | DriftAnimation;

export type PulseAnimation = {
  kind: "pulse";
  /** Scale at the rest point. Typically 1. */
  from: number;
  /** Peak scale. Typically 1.05–1.2 for UI; >1 grows, <1 shrinks. */
  to: number;
  /** One full pulse period (rest → peak → rest) in ms. */
  durationMs: number;
  repeat: number | "infinite";
};

export type BobAnimation = {
  kind: "bob";
  /** Vertical travel in cells. Oscillates between -amplitude and +amplitude. */
  amplitude: number;
  /** One full bob period in ms. */
  durationMs: number;
  repeat: number | "infinite";
};

export type FadeAnimation = {
  kind: "fade";
  /** Opacity at one extreme, 0..1. */
  from: number;
  /** Opacity at the other extreme, 0..1. */
  to: number;
  /** One full fade period (from → to → from) in ms. */
  durationMs: number;
  repeat: number | "infinite";
};

export type DriftAnimation = {
  kind: "drift";
  /** Continuous translation per second, in cells. Vector form keeps direction explicit. */
  velocity: { x: number; y: number };
};
```

The SVG renderer (Tier 1) implements all four via CSS transform/opacity on the entity's `<g>`:

- `pulse` → `transform: scale(s)` driven by sine ease (same easing function as `oscillate`).
- `bob` → `transform: translateY(...)` driven by sine ease.
- `fade` → `opacity` driven by sine ease.
- `drift` → `transform: translate(vx*t, vy*t)` linear.

`pulse`, `bob`, and `fade` follow `oscillate`'s API shape (sine-eased, bounded, `repeat` required). `drift` is always continuous and has no `repeat` — linear translation has no natural "iteration" boundary, so a finite repeat count would be ill-defined; an entity that needs to drift for a bounded distance can use a future one-shot tween kind. This keeps the mental model consistent: oscillate-family = bounded sine with iterations, spin/drift-family = unbounded continuous motion.

Per ADR 0007, this changes the public type surface — the ADR is required even though `extractExportNames` won't catch it.

## Consequences

- **Pro:** Direct expression of the four most-reached-for non-rotation animations in game-like UIs. Every demo and example becomes more expressive without composition machinery.
- **Pro:** Each kind is a small, isolated branch in the SVG renderer's `applyAnimation` switch — same pattern as `oscillate`/`spin`. Easy to test in isolation.
- **Pro:** Additive — existing `oscillate`/`spin` consumers are untouched.
- **Pro:** Sets up the composition ADR cleanly: once leaf kinds feel right, we can debate `parallel`/`sequence` against a concrete palette instead of a hypothetical one.
- **Con:** Six leaf kinds is a lot of variants for exhaustive switches. Mitigated by TypeScript's exhaustiveness checking and by the leaves being shallow (each is ~5 fields).
- **Con:** Without composition, an entity still gets exactly one animation. A button that *both* pulses and bobs has to wait for the next ADR. Acceptable for now — most demos can be authored with one animation per entity, and composition is the right next decision to make standalone.
- **Con:** The `pulse`/`fade` `from`/`to` shape diverges from `oscillate`'s `degrees` (amplitude-style). Picked `from`/`to` for `pulse`/`fade` because asymmetric ranges (e.g. fade 0.6 ↔ 1.0) are common; `oscillate` is symmetric around zero by nature. Documented; not worth retrofitting `oscillate`.

## Alternatives considered

- **Add a single general `tween` kind** with `property`, `from`, `to`, `easing`. More powerful, but harder to type narrowly (property-specific constraints like vector vs scalar) and harder to renderer-implement uniformly. We can add `tween` later as a sibling kind without retiring the leaf kinds.
- **Parameterize existing `oscillate` over `property: "rotate" | "scale" | "translate-y" | "opacity"`.** Cleanest in the abstract, but requires renaming/migrating `oscillate.degrees` (rotate-specific) and breaks the v0.1 ADR. Not worth the churn.
- **Defer until composition (`parallel`/`sequence`) is decided.** Composition is a strictly larger change; shipping leaves first lets composition be designed against concrete demand.
- **Ship only `pulse` + `bob`** (the two most obvious gaps) and defer `fade`/`drift`. Reasonable, but `fade` is needed for any entrance/exit UI and `drift` is the natural complement to `spin` (continuous translation vs continuous rotation). Bundling all four keeps the family complete.
