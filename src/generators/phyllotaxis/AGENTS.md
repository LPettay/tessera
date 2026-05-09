# src/generators/phyllotaxis — Agent Guide

**Purpose:** Phyllotaxis background generator — golden-angle dot placement, the first
mathematically-modeled generator in Tessera.

**Stamp:** <!-- STAMP:PLACEHOLDER -->

---

## What lives here

- `phyllotaxis.ts` — `phyllotaxisGenerator: BackgroundGenerator<PhyllotaxisConfig>`
- `index.ts` — re-export

## Key invariants

- Pure functions only. No DOM, no side effects, no renderer knowledge.
- Each dot is emitted as a separate `Entity` (id `phyllotaxis.dot.{n}`) so it is
  individually addressable by a cursor field or onFrame hook.
- Background is a flat `Cell[]` fill — the layer has a solid canvas.
- Out-of-bounds dots are silently dropped; the spiral naturally extends past the layer
  edge at high n.

## Rules

1. No consumer-specific defaults — config is always caller-supplied.
2. `lerpColor` is the only import from `../../index.ts`; keep dependencies minimal.
3. New mathematical generators (logarithmic spirals, L-systems, crystal lattices) go in
   sibling directories under `src/generators/`, not here.

## Invariants

These properties are exercised by `phyllotaxis.test.ts`. A failing test means the
generator drifted from its contract — fix the generator, not the test, unless the
invariant is being deliberately revised (in which case update both together).

1. **No dot outside layer bounds.** Every emitted entity's `position` satisfies
   `0 ≤ x < width` and `0 ≤ y < height`. Out-of-bounds dots are silently dropped, so
   high `count` or large `dotScale` never produce out-of-frame entities.
2. **Background covers every cell exactly once.** `cells.length === width * height`
   and each `(x, y)` appears once with the configured `background` fill.
3. **Entity ids are unique and follow `phyllotaxis.dot.{n}`.** `n` is the dot index
   (an integer in `[0, count)`), suitable for cursor-field or onFrame addressing.
4. **Color interpolates from `palette.inner` (n=0) to `palette.outer` (n=count-1).**
   Endpoints match the palette up to `lerpColor` rounding (≤1 per channel).
5. **`count = 0` returns no entities, a full background, and does not crash.**
6. **`count = 1` does not divide by zero.** The `config.count - 1 || 1` guard keeps
   `t` finite, so the single dot gets a valid hex color.

---

<!-- last-reviewed: 12eb28d -->
