# ADR 0026 — Phyllotaxis background generator

**Status:** Accepted  
**Layer:** Generator tier (`src/generators/`)  
**Deciders:** Lance Pettay  

---

## Context

The `sunburst` generator proved the `BackgroundGenerator<Config>` tier as a pattern for
procedurally filling a layer. Tessera's long-term vision is mathematically-grounded
sprites and scenes — physical models projected to voxel cells, not hand-authored art.

The phyllotaxis spiral (golden angle placement) is the canonical entry point for this
vision. It is the same mechanism nature uses to pack seeds in sunflowers, scales in pine
cones, and leaves around a stem. A single rule — place point n at angle n × φ, radius
√n × scale — produces the Fibonacci spiral structure automatically, with no additional
parameters.

## Decision

Add `phyllotaxisGenerator: BackgroundGenerator<PhyllotaxisConfig>` to
`src/generators/phyllotaxis/`.

Each dot is emitted as an individual voxel-sprite `Entity` (id `phyllotaxis.dot.{n}`)
rather than a `Cell`, so the cursor-repulsion field can address and offset every dot
independently. The background is a flat `Cell[]` fill at the configured background
color.

Color varies from `palette.inner` → `palette.outer` as `n` increases (inner dots near
the center, outer dots near the edge), making the spiral arm structure visible through
color banding without any explicit arm-detection logic.

### Key constants

| Symbol | Value | Meaning |
|--------|-------|---------|
| `φ` (golden angle) | `π(3 − √5) ≈ 2.3999` rad | angular step per dot |
| `r(n)` | `√n × dotScale` | radial distance for dot n |

## Consequences

- First "mathematically modeled" generator — establishes the pattern for future
  generators (logarithmic shells, crystal lattices, L-system trees, fluid sims).
- Because dots are entities, they react to `installCursorField` with zero extra code
  in the consumer.
- `count` and `dotScale` compose: `count ≈ width × height × 0.4` at `dotScale 2.2`
  fills a typical viewport without gaps or overflow at the edges.
- Out-of-bounds dots are silently dropped (the spiral extends past the layer edge at
  high n; clipping is correct behaviour).
