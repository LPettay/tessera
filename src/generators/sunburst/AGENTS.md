# AGENTS.md — `src/generators/sunburst/`

The first concrete `BackgroundGenerator` (v0.2). Emits a quantized radial gradient as `Layer.cells` plus an optional rotating ray-overlay `Entity`.

## Index

### Files here

| File | Purpose |
|---|---|
| `sunburst.ts` | The `sunburstGenerator` and its `SunburstConfig` type. Pure functions, no DOM. |
| `index.ts` | Re-exports the generator + config type. |

## Design

- **Cells = quantized radial gradient.** Every cell of the target Layer is colored by its distance from center, quantized into `bands` discrete steps (default 6). This is the foundation — "whole screen is voxels."
- **Entities = a single rotating ray-overlay.** Single-cell rays radiating from center, optionally spinning. Single-cell rays look jagged at diagonals — that's a known limitation. The gradient carries the visual; rays are accent only.
- **Pure & sync.** No DOM, no I/O, no `Math.random`. Per ADR 0013.

## Why two parts?

- A radial gradient *alone* doesn't say "sunburst" — it says "soft glow." Adding the ray overlay reinstates the sunburst character.
- A pure-entity sunburst (v0.1's approach) leaves 90% of the screen as page background. Cells fill the gap.
- Layered, the cell field is static (rotating it would invisibly change a circular-symmetric gradient) while the ray entity provides the motion. Best of both.

## What's NOT here

- The LLM bridge that maps a user prompt to a `SunburstConfig` — that's v0.3.
- A "thicker rays" ray-rasterization upgrade — v0.2.x or later. Single-cell rays are deliberately accepted for v0.2.0 because the gradient does the heavy visual lifting.

---

<!-- last-reviewed: 537fbf5 -->
