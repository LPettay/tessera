# AGENTS.md — `examples/`

Hand-crafted demo scenes that consume the public Tessera API. Each example is independent — its own directory, its own dev server entry point, its own AGENTS.md.

## Index

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `mug-svg/` | [`mug-svg/AGENTS.md`](./mug-svg/AGENTS.md) | The MotionPitch coffee mug, ported to Tessera primitives. v0.1 regression test for the SVG renderer + page-citizenship surface. |
| `menu-svg/` | [`menu-svg/AGENTS.md`](./menu-svg/AGENTS.md) | Stylized title-screen scene exercising the v0.2.x non-rotation Animation kinds (`pulse`, `bob`, `fade`, `drift`). |

### Planned (not yet created)

| Dir | Purpose | Tracked in |
|---|---|---|
| `mug-canvas2d/` | Same mug rendered through the Canvas2D renderer | v0.2 milestone |
| `particles-webgl2/` | Particle system demo on the WebGL2 renderer | v0.3 milestone |

## Cross-cutting rules

- **Examples consume the public API only.** Import from `../../src/index.ts`. Do not reach into `../../src/core/` or `../../src/renderers/` directly — if an example needs something not exported, that's a signal to expand the public API (with an ADR per ADR 0007), not to bypass the boundary.
- **Each example is a self-contained directory.** Keep `dev.ts`, `main.ts`, the scene definition(s), and `index.html` co-located.
- **The dev server pattern uses `Bun.serve` + `Bun.build`** — no Vite, no Webpack. See `mug-svg/dev.ts` for the canonical shape.
- **Examples are part of the v0.x test surface.** A failing example is a regression — examples must build and render whatever the milestone says they should. See ADR 0011.

## Dev workflow

```bash
bun run dev:mug         # mug-svg example at http://localhost:3000
bun run dev:menu        # menu-svg example at http://localhost:3001
```

Each example registers a top-level script in `package.json` of the form `dev:<example-name>`.

## What does NOT live here

- The framework itself → `src/`
- Per-renderer test harnesses → live alongside the renderer code in `src/renderers/<tier>/`
- Repo hygiene tooling → `scripts/`

---

<!-- last-reviewed: 70957f3 -->
