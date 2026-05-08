# AGENTS.md — `examples/breakapart-svg/`

The canonical demo for the `tween` Animation kind (ADR 0020). "TESSERA" is
rasterized to its individual glyph-pixel cells via `rasterizeText()`, each
cell is lifted into a standalone Entity, and each entity gets a `tween`
animation flying it outward from the text centroid and back — `yoyo: true,
repeat: "infinite"`. Duration jitter (700–1100 ms) desynchronises cells over
time, turning the initial synchronized burst into a continuous shimmering wave.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Composed `Scene` — per-cell tween entities + static label. Uses `rasterizeText` from the public API. |
| `main.ts` | Browser entry — mounts `svgRenderer` on `#scene`, wraps with `withPageCitizenship`. |
| `index.html` | Static page. Deep-charcoal background. |
| `dev.ts` | `Bun.serve` dev server on port 3005. Run via `bun run dev:breakapart`. |
| `build.ts` | Static build → `dist/breakapart/`. Run via `bun run build:breakapart`. |

## Rules

- **Imports from `../../src/index.ts` only.** `rasterizeText` and `measureText` are now public.
- **One animation per entity** — the breakapart effect is achieved by decomposing the text into many entities, not by stacking animations.

## How to verify locally

```bash
bun run dev:breakapart
# open http://localhost:3005
# expected:
#   - "TESSERA" glyphs explode outward from centre and reform, infinitely
#   - cells travel at slightly different speeds (duration jitter)
#   - the wave effect emerges after the first 1–2 cycles
#   - label "VOXEL BREAKAPART" sits static near the bottom
# switch tabs → animations pause; return → resume
# OS reduced-motion → all freeze
```

## What's intentionally missing

- **Phase offset per cell.** Stagger is achieved through duration variation only; there's no `phaseOffsetMs` field on `TweenAnimation`. True phase control lands with the composition ADR.
- **Hold at peak.** `ease-in-out` creates a natural slow zone at the target position, but there is no explicit "hold for N ms" phase. A multi-step sequence kind could model that cleanly.

---

<!-- last-reviewed: c70879b -->
