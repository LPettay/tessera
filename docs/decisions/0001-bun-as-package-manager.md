# ADR 0001: Use Bun as package manager and runtime

## Status

Accepted — 2026-04-25

## Context

Tessera needs a single toolchain for install, run, scripts, and TypeScript execution. Lance has a global preference for Bun over npm/yarn/pnpm, and the dev-substrate scripts (`scripts/check.ts`, `scripts/stamp.ts`, etc.) benefit from Bun's native TypeScript execution — no transpile step, no `ts-node` overhead.

## Decision

Use Bun ≥ 1.1 as both package manager and runtime for development. Commit `bun.lock` (text format) for reproducible builds. Forbid `npm`, `yarn`, and `pnpm` invocations in the repo, enforced by `check-forbidden.ts` (rejects committed `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`).

The published package itself is a vanilla ESM TS library and runs in **any** modern JS runtime — Node, Bun, Deno, browsers. The Bun-only rule applies to the *dev workflow*, not to consumers of `tessera-engine`.

## Consequences

- Faster `install` and dev startup vs. npm
- Native TypeScript execution for `scripts/`, no transpile step
- Contributors must have Bun installed; documented in CONTRIBUTING + README
- Published package remains runtime-agnostic; consumers do not need Bun

## Alternatives considered

- **npm** — slower, no upside for this project
- **pnpm** — fast and excellent, but Lance prefers Bun and the consumer-facing tradeoffs are negligible
- **Yarn (any version)** — Bun's lockfile design is simpler and the install perf is competitive
