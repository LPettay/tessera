# AGENTS.md — `scripts/`

Repo-hygiene tooling. **Not** product code. These scripts enforce the conventions documented in every other `AGENTS.md`.

## Index

### Files here

| File | Purpose |
|---|---|
| `check.ts` | Orchestrator. Runs all enabled checks and reports findings. |
| `stamp.ts` | Writes the `<!-- last-reviewed: SHA -->` footer to AGENTS.md files. |
| `worktree.ts` | Manage `git worktree`s for parallel agents (`wt:add` / `wt:list` / `wt:remove`). See ADR 0003. |

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `lib/` | [`lib/AGENTS.md`](./lib/AGENTS.md) | Helper modules and individual `check-*.ts` checks |

## Rules

- **No framework imports, no React.** This directory must run standalone via `bun run scripts/check.ts`.
- **Stdlib + node only.** Use `node:fs`, `node:path`, `node:child_process`. No runtime dependencies.
- **Exit codes matter.** `0` = pass, `1` = errors, `2` = bad invocation. Pre-commit and CI rely on this.
- **Findings carry `code`, `message`, optional `path`, optional `fix`.** Anything user-visible must include a `fix` hint.
- **Tunables go in `lib/config.ts`.** Never hardcode in checks.

## Adding a new check

1. Add a `lib/check-<name>.ts` exporting a `check<Name>(repoRoot): CheckResult` function.
2. Wire it into `check.ts`'s `ALL` array and dispatch.
3. Document it in `lib/AGENTS.md`.
4. Add the human-readable explanation to `CONTRIBUTING.md` under Enforcement.

## What does NOT live here

- Product runtime code → `src/`
- Documentation → `docs/`
- CI workflow files → `.github/workflows/`
