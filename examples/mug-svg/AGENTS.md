# AGENTS.md — `examples/mug-svg/`

The MotionPitch coffee mug, ported to Tessera primitives. **v0.1 regression test** — exercises the full public API surface end-to-end: `Scene` → SVG renderer (Tier 1) → `RendererController` → `withPageCitizenship` wrapper.

## Index

### Files here

| File | Purpose |
|---|---|
| `mug-scene.ts` | The mug as a `Scene` — one `Layer`, one `Entity`, voxel-sprite cells in entity-local coords with pivot at origin. |
| `main.ts` | Browser entry — mounts `svgRenderer` on `#scene`, wraps with `withPageCitizenship`. |
| `index.html` | Static page that hosts the demo. |
| `dev.ts` | `Bun.serve` dev server — bundles `main.ts` on demand via `Bun.build`. Run via `bun run dev:mug`. |

## Rules

- **Imports come from `../../src/index.ts` only.** Do not reach into `core/` or `renderers/svg/` directly. The example is also the public-API smoke test; bypassing the boundary defeats that.
- **No new runtime dependencies.** Pure browser APIs + Tessera + (dev-only) Bun's stdlib.
- **Scene authoring stays in `mug-scene.ts`.** `main.ts` only mounts; it does not assemble cells inline.

## What's intentionally missing in v0.1

- **Steam wisps** — the original MotionPitch mug had three animated steam columns rising from the cup. They use translate-style animation, which v0.1 does not yet support. They land when the framework gains a `translate` Animation kind (likely v0.2 or v0.3).
- **Ground shadow ellipse** — Tessera renders voxel cells, not arbitrary SVG primitives. An ellipse-as-cells looks crude; a proper shadow primitive is a v0.2+ design question.
- **Dynamic palette** — the original generated palettes per LLM call. The v0.1 example hardcodes one warm-brown palette to keep the test surface deterministic.

## How to verify locally

```bash
bun run dev:mug
# open http://localhost:3000
# expected: a brown pixel mug rotating ±22° on its Y-axis with a 6.5s period
# scroll the page so the mug exits the viewport — the rotation should pause
# scroll back — it resumes
# OS-level "reduce motion" — it should freeze (and stay frozen)
```

---

<!-- last-reviewed: 70957f3 -->
