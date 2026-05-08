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

---

<!-- last-reviewed: 12eb28d -->
