# AGENTS.md — `src/generators/sunburst/`

The first concrete `BackgroundGenerator` (v0.2). Emits a quantized radial gradient as `Layer.cells` plus a rotating ray-overlay `Entity` whose shape is `vector`-kind segments (ADR 0014 — pixel-locked rotation).

## Index

### Files here

| File | Purpose |
|---|---|
| `sunburst.ts` | The `sunburstGenerator` and its `SunburstConfig` type. Pure functions, no DOM. |
| `index.ts` | Re-exports the generator + config type. |

## Design

- **Cells = quantized radial gradient.** Every cell of the target Layer is colored by its distance from center, quantized into `bands` discrete steps with optional per-cell `bandJitter` to fray the band edges. This is the foundation — "whole screen is voxels."
- **Entities = a single rotating ray-overlay**, shape kind `vector`. Each ray is a `VectorSegment` line from origin outward. The renderer rotates segment endpoints in cell-space and rasterizes to axis-aligned cells per frame — pixels stay locked to the grid at every angle. See ADR 0014.
- **Pure & sync.** No DOM, no I/O, no `Math.random`. Per ADR 0013.

## Why the rays use `vector` instead of `voxel-sprite`

The earlier (closed) attempt used `voxel-sprite` for the rays — pre-computed cells in entity-local coords, the entire group rotated via CSS transform. That produced jagged "spider-web" lines at intermediate angles because individual cells were tilted off the grid. ADR 0014's `vector` shape kind fixes this fundamentally: rays are continuous segments, rasterization is per-frame, cells stay axis-aligned at every angle.

## What's NOT here

- The LLM bridge that maps a user prompt to a `SunburstConfig` — that's v0.3.
- Wedge/tapered ray rasterization — current rays are constant-thickness bars. Tapered rays (wider at base, narrower at tip) would require either multiple segments per ray or a new `VectorSegment` kind. Defer until a use case demands it.

---

<!-- last-reviewed: 8fdbcef -->
