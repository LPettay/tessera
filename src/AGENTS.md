# AGENTS.md — `src/`

Framework source. Everything that ships in the `tessera-engine` package lives under here.

## Index

### Files here

| File | Purpose |
|---|---|
| `index.ts` | Public API surface — every name re-exported here is part of the published API. **Changes require an ADR.** See [ADR 0007](../docs/decisions/0007-public-api-surface-contract.md). |

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `core/` | [`core/AGENTS.md`](./core/AGENTS.md) | Engine — scene description types and renderer contract. **Vanilla TS, zero runtime deps, no React.** |

### Planned (not yet created)

| Dir | Purpose | Tracked in |
|---|---|---|
| `renderers/svg/` | Tier 1 — SVG renderer (v0.1) | ADR 0005, `docs/architecture.md` |
| `renderers/canvas2d/` | Tier 2 — Canvas2D renderer (v0.2) | ADR 0005 |
| `renderers/webgl2/` | Tier 3 — WebGL2 renderer with transform-feedback particle sim (v0.3) | ADR 0005 |
| `adapters/react/` | React adapter — `<TesseraScene />` + hooks. **Thin wrapper over the imperative core.** | ADR 0006 |

## Cross-cutting rules

- **Imports use `@/` alias** (mapped to `src/` in `tsconfig.json`).
- **No React anywhere under `core/`.** React lives only in `adapters/react/`.
- **Each renderer is independently shippable.** Do not import one renderer from another.
- **Public API surface is `index.ts` re-exports.** Anything not re-exported is internal.

## Dependency direction

```
adapters/react/   ─→   core/  ←─   renderers/{svg,canvas2d,webgl2}/
                        ↑
                       index.ts (public API)
```

Renderers depend on core. The React adapter depends on core. Core depends on nothing.

## Status

v0.1 in progress. Scene description types and renderer contract land in the first PR (`feat/v0.1-scene-model`). The SVG renderer, page-citizenship layer, and MotionPitch coffee-mug example follow in subsequent PRs.

---

<!-- last-reviewed: 9f81cf4 -->
