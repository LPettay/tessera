# AGENTS.md — `docs/decisions/`

Architecture Decision Records (ADRs). One markdown file per structural decision.

## Index

### Files here

| File | Decision |
|---|---|
| `0000-template.md` | Template — copy this for new ADRs |
| `0001-bun-as-package-manager.md` | Use Bun as package manager + runtime |
| `0002-pr-cycle-on-main.md` | Branch-protected `main`; every change goes through a PR |
| `0003-git-worktrees-for-parallel-agents.md` | One `git worktree` per concurrent agent session |
| `0004-agents-md-index-convention.md` | Every `AGENTS.md` carries a navigable Index section |
| `0005-three-tier-renderer-with-page-citizenship.md` | Pluggable SVG/Canvas2D/WebGL2 renderer + page-citizenship layer |
| `0006-vanilla-core-react-adapter.md` | Vanilla TS core + thin React adapter (no React in `src/core/`) |
| `0007-public-api-surface-contract.md` | `src/index.ts` re-exports are the public API; changes require an ADR |
| `0008-renderer-owns-loop-mount-returns-controller.md` | Renderers own their animation loop; `mount()` returns a `RendererController` |
| `0009-svg-renderer-vanilla-dom.md` | SVG renderer (Tier 1, v0.1) ships with vanilla DOM + RAF — no `framer-motion`, no `motion-one` |
| `0010-page-citizenship-as-controller-wrapper.md` | `withPageCitizenship(inner, container)` — wrapper-function shape for the page-citizenship layer; sticky reduced-motion |
| `0011-examples-directory-and-dev-server.md` | `examples/<name>/` directory layout + `Bun.serve` + `Bun.build` dev-server pattern; examples consume the public API only |
| `0012-animation-spin-kind.md` | Extend `Animation` union with `spin` kind for continuous rotation; SVG tier animates `axis: "z"` only |
| `0013-background-generator-primitive.md` | `BackgroundGenerator<Config>` primitive — pure function returning cells + entities for a layer fill |
| `0014-vector-shape-rasterizer.md` | `vector` `EntityShape` kind — segments rotated in cell-space and rasterized to axis-aligned cells per frame (pixel-locked rotation) |
| `0015-gh-pages-deploy.md` | Deploy `dist/` (built by `bun run build:examples`) to GitHub Pages via Actions workflow; URL `https://lpettay.github.io/tessera/` |
| `0016-animation-leaf-kind-palette.md` | Add `pulse`, `bob`, `fade`, `drift` to `Animation` union (Accepted) |
| `0017-gallery-and-multi-example-layout.md` | Gallery hub at `/`, per-demo URLs at `/<name>/`; mug moves from `/` to `/mug/` |
| `0018-text-entity-shape.md` | `text` `EntityShape` kind with built-in 5×7 ASCII font (Accepted) |
| `0019-text-shape-scale.md` | `TextShape.scale` — sub-cell glyph rendering for typography-scale text (Accepted) |
| `0020-tween-animation-kind.md` | `tween` `Animation` kind — bounded eased translation with optional yoyo; `rasterizeText`/`measureText` graduate to public API (Accepted) |
| `0021-voxel-cell-as-atom.md` | Tessera's atom is the 2D voxel-cell — load-bearing framing ADR; defines the L0–L5 abstraction stack future ADRs reference (Accepted) |
| `0022-cell-drawing-helpers.md` | L1 drawing helpers — `rect` / `grid` / `outline` / `gradient` / `lerpColor` pure functions returning `VoxelSpriteCell[]` (Accepted) |

When you add an ADR, add a row above and bump the number sequentially.

## Rules

- **One decision per file.** If a PR makes two decisions, write two ADRs.
- **Numbered sequentially.** `0001-...`, `0002-...`, etc.
- **Filename is `NNNN-kebab-case-title.md`.**
- **Status is one of:** `Proposed`, `Accepted`, `Superseded by ADR-NNNN`, `Deprecated`.
- **Keep them under a screen.** ADRs are read often; long ones don't get read.
- **Never delete an ADR.** Mark it `Superseded` and write the new one. The history is the value.

## When to write one

- Adopt or drop a library/framework
- Change directory structure
- Change the public API surface (anything re-exported from `src/index.ts`)
- Change a renderer tier's contract or add a new tier
- Add or remove an `AGENTS.md` boundary
- Anything that future-you will ask "wait, why did we do it this way?" about

## When NOT to write one

- Bug fixes that don't change the API
- Internal refactors
- Style tweaks
- Adding tests

---

<!-- last-reviewed: 030f15b -->
