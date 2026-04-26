# ADR 0003: One git worktree per concurrent agent session

## Status

Accepted — 2026-04-25

## Context

Multiple AI agent sessions (Cursor, Claude Code, etc.) often run in parallel against the same on-disk checkout. The result is a class of subtle, hard-to-diagnose bugs: when session A runs `git switch -c <branch>`, it moves the shared `HEAD`, and when session B subsequently runs its own `git switch -c <other-branch>`, the new branch is rooted at session A's tip rather than `main`. Session B then commits work that includes session A's commits by accident, pushes them under a misnamed remote ref, and only diff comparison catches it.

The root cause is structural: **a git checkout has exactly one `HEAD`**. Two agents sharing one checkout share one HEAD. Any coordination scheme built on top of "remember to switch to `main` before branching" is one missed step away from the same failure. The MotionPitch repo was bitten by this pattern within its first day.

## Decision

Every concurrent agent session works in its own `git worktree`. The primary checkout (`~/Tessera`) stays on `main` and is used only for pulls and admin. All real work happens in sibling worktrees at `~/Tessera-wt/<slug>/`, each with its own independent `HEAD`, index, stash, and pre-commit invocation.

A small helper (`scripts/worktree.ts`, exposed as `bun run wt:add | wt:list | wt:remove`) wraps `git worktree` with the naming convention and handles three cases automatically:

- **New branch** — branched from `origin/main` after a fetch.
- **Existing local branch** — checked out into the new worktree as-is.
- **Existing remote branch** — created locally tracking `origin/<branch>`.

The branch keeps its slash (`feat/svg-renderer`); the worktree directory flattens it (`feat-svg-renderer`).

## Consequences

- **Pro:** Cross-session contamination becomes structurally impossible. Each session's `HEAD` lives in its own working directory.
- **Pro:** Each worktree runs its own pre-commit hook against its own diff.
- **Pro:** `git stash` is per-worktree, so two agents can't pop each other's WIP.
- **Pro:** Onboarding a new parallel session is a single command: `bun run wt:add <branch>`.
- **Pro:** `gh pr create`, `gh pr merge`, and lefthook all work transparently — `.git/` is shared, only the working tree is per-worktree.
- **Con:** Each worktree gets its own `node_modules` (Bun's CAS keeps disk impact small).
- **Con:** Agents must run repo commands from inside their worktree, not from the primary checkout.

## Alternatives considered

- **Convention-only ("always switch to `main` before branching")** — failed within the first day on the previous repo. Rejected.
- **One agent at a time** — defeats parallelism. Rejected.
- **Per-session full clones** — works but heavyweight: every clone re-fetches all refs, and pushing/pulling between clones requires `origin` round-trips. Worktrees share `.git/`. Rejected.
- **Lockfile / mutex on `.git/HEAD`** — invents a coordination protocol that git already solved with worktrees. Rejected.
