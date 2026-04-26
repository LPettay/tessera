# ADR 0007: `src/index.ts` re-exports define the public API; changes require an ADR

## Status

Accepted — 2026-04-25

## Context

Tessera will be published to NPM and consumed by downstream apps. Frameworks live or die on API stability — accidental renames, signature changes, or new mandatory parameters break consumers in ways that are expensive to discover and embarrassing to ship. The MotionPitch hackathon never had to think about this because it had no public API; Tessera does.

The risk is high during pre-v1 because the engine is still finding its shape and the natural temptation is to refactor the surface alongside internals. We need a mechanism that makes API changes deliberate, visible, and documented — not silent side effects of internal refactors.

## Decision

The **public API surface** is exactly the set of names re-exported from `src/index.ts`. Internal modules (anything not re-exported) can be refactored freely.

Three layers enforce the contract:

1. **AGENTS.md guidance** — root `AGENTS.md` lists "Public API" as a hard constraint and instructs agents that changes to `src/index.ts` require an ADR.
2. **`scripts/lib/check-api-surface.ts`** — extracts the set of exported names from `src/index.ts`, compares them against a stamped snapshot at `docs/api-surface.txt`, and fails the build if they differ. Activates when `src/index.ts` ships its first export.
3. **CONTRIBUTING.md PR rule** — any PR touching `src/index.ts` must include an ADR in `docs/decisions/` describing the addition/removal/rename.

Procedure for a deliberate API change:

1. Update `src/index.ts`.
2. Add an ADR documenting the change.
3. Run `bun run check` — `check-api-surface` will fail with `API_SURFACE_CHANGED`.
4. Inspect the diff: `diff <(sort docs/api-surface.txt) <(grep -E '^export' src/index.ts ...)`
5. Update `docs/api-surface.txt` to match the new surface.
6. Re-run `bun run check` — now passes.
7. Open the PR with the ADR + the snapshot update + the source change in one atomic PR.

Post-v1 additionally: breaking changes bump the major version; non-breaking additions bump the minor.

## Consequences

- **Pro:** API changes are deliberate and documented. No accidental breakage from refactors.
- **Pro:** A consumer reading `docs/api-surface.txt` sees the entire public surface in one place.
- **Pro:** The ADR pile becomes a versioned changelog of API evolution — invaluable for upgrade guides.
- **Con:** Every API change costs an ADR. That is the point — the friction is intentional and the ADR is short.
- **Con:** The export-extraction in `check-api-surface.ts` is heuristic, not a full TypeScript parser. Edge cases (computed names, conditional re-exports) may slip through. Acceptable: the check is a backstop, the review is the primary gate.

## Alternatives considered

- **Trust convention only** — doesn't survive a single careless refactor. Rejected.
- **Use TypeScript's `--declaration` output as the snapshot** — richer signal (signatures, not just names) but slower to compute, harder to diff, and produces noisy churn from internal type changes. Could revisit post-v1; for now the names-only snapshot is sufficient.
- **Use api-extractor or similar tooling** — heavier dep, more setup, more configuration to maintain. The 80-line in-repo check covers the 80% case.
- **Forbid breaking changes pre-v1** — too restrictive while the engine is still finding its shape. The ADR-gate is a softer answer that documents *why* something changed.
