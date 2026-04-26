# AGENTS.md — `examples/mug-svg/`

The MotionPitch coffee shop, ported to Tessera primitives. **v0.1 regression test** — exercises every public name shipped so far: `Scene`, multi-`Layer` rendering, two `Animation` kinds (`oscillate` + `spin`), the SVG renderer (Tier 1), and the `withPageCitizenship` wrapper.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Composed `Scene` — sunburst background Layer (spin Z) + mug foreground Layer (oscillate Y). Mug + sunburst cell data live here. |
| `main.ts` | Browser entry — mounts `svgRenderer` on `#scene`, wraps with `withPageCitizenship`, sets full-viewport `preserveAspectRatio`. |
| `index.html` | Static page that hosts the demo. Full-bleed SVG; tiny brand label in the corner. |
| `dev.ts` | `Bun.serve` dev server — bundles `main.ts` on demand via `Bun.build`. Run via `bun run dev:mug`. |

## Rules

- **Imports come from `../../src/index.ts` only.** Do not reach into `core/` or `renderers/svg/` directly. The example is also the public-API smoke test; bypassing the boundary defeats that.
- **No new runtime dependencies.** Pure browser APIs + Tessera + (dev-only) Bun's stdlib.
- **Scene authoring stays in `scene.ts`.** `main.ts` only mounts; it does not assemble cells inline.

## What's intentionally missing in v0.1

- **Steam wisps** — the original MotionPitch mug had three animated steam columns rising from the cup. They use translate-style animation, which v0.1 does not yet support. They land when the framework gains a `translate` Animation kind.
- **Ground shadow ellipse** — Tessera renders voxel cells, not arbitrary SVG primitives. An ellipse-as-cells looks crude; a proper shadow primitive is a v0.2+ design question.
- **Dynamic palette** — the original generated palettes per LLM call. The v0.1 example hardcodes one warm-coffee palette to keep the test surface deterministic.

## How to verify locally

```bash
bun run dev:mug
# open http://localhost:3000
# expected:
#   - a dark coffee-toned voxel sunburst slowly rotating CCW (~30s/rev)
#   - a brown pixel mug in front, oscillating ±22° on its Y-axis (6.5s period)
#   - the SVG fills the viewport (no letterboxing)
# scroll out of view OR switch tabs → both animations should pause
# OS-level "reduce motion" → both should freeze (and stay frozen even after toggling resume)
```

## Why a single example file holds both shapes

The mug and sunburst could live in separate files (`mug-cells.ts`, `sunburst.ts`). For v0.1 they're co-located in `scene.ts` because (a) both are < 100 lines, (b) the composed `Scene` is the unit a reader cares about, and (c) splitting forces a name like `mug-cells` that doesn't actually do anything except hold an array. Revisit if either grows past ~80 lines.

---

<!-- last-reviewed: 68c5dc0 -->
