# AGENTS.md — Tessera

Authoritative agent instructions for this repository. Read this before any non-trivial edit.

Each subdirectory has its own `AGENTS.md` with scope-specific guidance — read those too when working within that directory.

---

## Crawl map

Every `AGENTS.md` in the repo, with its purpose.

```
.
├── AGENTS.md                            ← you are here (constraints, scope, agent workflow)
├── docs/AGENTS.md                       Architecture + ADR conventions
│   └── decisions/AGENTS.md              ADR format + when to write one
├── examples/AGENTS.md                   Demo scenes consuming the public API
│   └── mug-svg/AGENTS.md                MotionPitch coffee mug — v0.1 regression test
├── scripts/AGENTS.md                    Repo-hygiene scripts (check, stamp, worktree)
│   └── lib/AGENTS.md                    Check helper modules
└── src/AGENTS.md                        Framework source — core/ types, renderers/svg/
    └── core/AGENTS.md                   Engine core — vanilla TS, no React
```

---

## Project at a glance

**Tessera** — TypeScript framework for layered 2D voxel scenes. Pluggable renderer (SVG / Canvas2D / WebGL2). Dynamic entities. Page-citizenship defaults. Designed to grow into a 2D game engine without rewriting userland.

**The wedge:** the same scene description renders from a 30-rect SVG marketing hero up to a million-particle WebGL2 sim — no userland rewrites.

**Status:** pre-alpha (v0.2 in progress). v0.1 shipped: scene model, renderer contract, SVG renderer (Tier 1), page-citizenship wrapper, both `Animation` kinds (`oscillate` + `spin`), MotionPitch coffee mug regression test. v0.2 adds the `BackgroundGenerator<Config>` primitive (ADR 0013) and ships at least two concrete generators (sunburst + halftone) so the demo becomes a *prompt-driven full-screen voxel scene* rather than a centered rotating shape.

---

## Hard constraints (do not violate)

| Concern | Rule |
|---|---|
| Package manager | **`bun` only.** Never `npm`, `yarn`, `pnpm`. |
| Runtime | Bun for dev. Node-compatible build output (the framework runs in any modern JS runtime). |
| Language | TypeScript, strict. No `any` without a justified comment. |
| Core framework deps | **Zero runtime deps in `src/core/`.** The engine must be standalone. |
| Renderer adapters | Each renderer (SVG / Canvas2D / WebGL2) is independently shippable. **Do not couple them.** |
| React | Lives in a thin adapter only. **Never import React from `src/core/`.** |
| Comments | Explain *why*, not *what*. No narrating comments. |
| Public API | `src/index.ts`'s re-exports are the published surface. **Changes to that file require an ADR.** |

---

## Definition of "done" for v0.2

The framework can:
1. Define a `BackgroundGenerator<Config>` — a pure function `(config, geometry) → { cells, entities }`.
2. Ship at least two concrete generators producing visually distinct full-screen voxel scenes (sunburst + halftone).
3. Demo a *preset switcher* that lets a user flip between configs and see the rendered scene change live.
4. Deploy the demo to GitHub Pages.

v0.1 (already shipped): scene model, renderer contract, SVG renderer (Tier 1), page-citizenship wrapper, `oscillate` + `spin` Animation kinds, MotionPitch coffee-mug regression test.

---

## Anti-scope-creep firewall (milestone-scoped)

These are **out of scope for v0.2** — not banned forever, banned for this milestone. Each is tagged with the milestone where it lands.

- Canvas2D renderer → v0.3
- LLM bridge for generator configs (prompt → Config via Gemini/etc.) → v0.3
- WebGL2 renderer → post-v0.3
- Sprite-stack rendering primitives → post-v0.3
- Particle systems → post-v0.3
- Editor / scene file format → post-v1
- WebGPU renderer → post-v1
- Vue / Solid / web-components adapters → post-v1

If a contributor (human or AI) proposes one of these for v0.2, redirect to the milestone where it belongs.

---

## How to work here as an agent

1. **Always read the relevant directory's `AGENTS.md`** before editing files in it.
2. **Prefer editing existing files** over creating new ones.
3. **Before suggesting a new dependency**, ask: does the standard library cover it? It usually does in a framework context.
4. **Before running `bun add <pkg>`**, confirm with the human.
5. **After substantive edits**, run `bun run check` (the pre-commit hook will too).
6. **Structural decisions get ADRs.** New directory, new dependency, schema change, API surface change — append a one-paragraph ADR to `docs/decisions/`.
7. **Conventional Commits** for messages. See [CONTRIBUTING.md](./CONTRIBUTING.md).
8. **Never commit directly to `main`** — it's branch-protected (except for the bootstrap commits in initial history). One feature = one branch = one PR = one squash-merge.
9. **Parallel agents work in worktrees.** A single checkout has one `HEAD`; two sessions trample. Use `bun run wt:add <branch>`.

---

## Index convention

Every `AGENTS.md` carries an **Index** section with up to three sub-tables — include only the ones that apply: **Files here**, **Subdirectories**, **Planned (not yet created)**. See [ADR 0004](./docs/decisions/0004-agents-md-index-convention.md).

---

## Enforcement

Five layers stop bad commits. `bun run check` reports everything and tells you how to fix it.

- **AGENTS.md is mandatory** for every directory under `src/`, `docs/`, `scripts/`, `examples/` that contains files.
- **AGENTS.md goes stale** after >5 non-AGENTS file changes in its directory since the last stamp. Re-stamp with `bun run agents:stamp <path>`.
- **No `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`** — bun only.
- **No committed `.env*` files**.
- **Public API surface** — changes to `src/index.ts` require an ADR (enforced by review and by `check-api-surface`).

Full details: [`CONTRIBUTING.md`](./CONTRIBUTING.md#enforcement).

---

## What to ask the human about

Decisions that need human sign-off:
- New runtime dependency in `src/core/`
- API surface change (anything re-exported from `src/index.ts`)
- New renderer tier
- Anything that bumps the framework to a new milestone

Decisions you can make autonomously:
- Bug fixes that don't change the public API
- TypeScript type tightening
- Internal refactors that don't change behavior
- Adding tests
- Documentation improvements

---

<!-- last-reviewed: e5415c7 -->
