# AGENTS.md — `src/renderers/`

Renderer adapters. Each tier implements the `Renderer` contract from `src/core/renderer.ts` against a different backend.

## Index

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `svg/` | [`svg/AGENTS.md`](./svg/AGENTS.md) | Tier 1 — SVG renderer (v0.1). Vanilla DOM, RAF-driven. |

### Planned (not yet created)

| Dir | Purpose | Tracked in |
|---|---|---|
| `canvas2d/` | Tier 2 — Canvas2D renderer (v0.2) | ADR 0005 |
| `webgl2/` | Tier 3 — WebGL2 renderer with transform-feedback particle sim (v0.3) | ADR 0005 |

## Cross-cutting rules

- **Each renderer is independently shippable.** Pick a tier without dragging the others in.
- **Depend only on `src/core/`.** Never import from sibling renderers — even helper utilities. If two renderers want the same helper, lift it into `src/core/` (with an ADR) or duplicate it.
- **Renderer-specific runtime deps are allowed**, but document them in the renderer's `AGENTS.md` and in the relevant ADR. Core stays zero-dep regardless.
- **Capabilities are honest.** A renderer's `capabilities.maxCellsPerLayer` and `capabilities.particles` drive the auto-selector — don't lie to look better.
- **Mount returns a controller.** ADR 0008. Renderers own their loop; userland gets `pause / resume / setScene / dispose`.

## Dependency direction

```
src/core/  ←─  src/renderers/{svg,canvas2d,webgl2}/
```

Renderers depend on core. Core does not depend on renderers. Renderers do not depend on each other.

---

<!-- last-reviewed: 2a93c31 -->
