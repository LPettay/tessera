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
├── scripts/AGENTS.md                    Repo-hygiene scripts (check, stamp, worktree)
│   └── lib/AGENTS.md                    Check helper modules
└── src/AGENTS.md                        Framework source root (placeholder until v0.1)
```

---

## Project at a glance

**Tessera** — TypeScript framework for layered 2D voxel scenes. Pluggable renderer (SVG / Canvas2D / WebGL2). Dynamic entities. Page-citizenship defaults. Designed to grow into a 2D game engine without rewriting userland.

**The wedge:** the same scene description renders from a 30-rect SVG marketing hero up to a million-particle WebGL2 sim — no userland rewrites.

**Status:** pre-alpha (v0). The framework's actual code does not yet exist; `src/` is a placeholder. This repo currently contains the dev substrate only.

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

## Definition of "done" for v0.1

The framework can:
1. Render a fixed 2D voxel scene with one layer of cells (SVG renderer).
2. Place a single dynamic entity at a cell position with a Y-axis oscillation animation.
3. Pause when scrolled offscreen via IntersectionObserver.
4. Honor `prefers-reduced-motion`.

The MotionPitch coffee-mug ports as the first example and is the v0.1 regression test.

---

## Anti-scope-creep firewall (milestone-scoped)

These are **out of scope for v0.1** — not banned forever, banned for this milestone. Each is tagged with the milestone where it lands.

- Canvas2D renderer → v0.2
- Multi-layer scenes → v0.2
- WebGL2 renderer → v0.3
- Sprite-stack rendering primitives → v0.3
- Particle systems → v0.3 / v0.4
- Editor / scene file format → post-v1
- WebGPU renderer → post-v1
- Vue / Solid / web-components adapters → post-v1

If a contributor (human or AI) proposes one of these for v0.1, redirect to the milestone where it belongs.

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

- **AGENTS.md is mandatory** for every directory under `src/`, `docs/`, `scripts/` that contains files.
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
