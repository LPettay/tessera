<!--
Keep PRs small (< 300 lines diff ideal). Strike or delete checklist items
that don't apply rather than shipping unchecked boxes — they read as
incomplete tasks.
-->

## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to ADR, issue, or milestone if relevant. -->

## Milestone

<!-- Which milestone does this target? v0.1 / v0.2 / v0.3 / etc. -->

## API impact

<!-- Pick exactly one and DELETE the others. -->
- [ ] **No public API change** — internal refactor / bug fix / docs / chore
- [ ] **Public API addition** — non-breaking; ADR included in this PR; `docs/api-surface.txt` updated
- [ ] **Public API breaking change** — ADR + version bump notes included; targets a major release

## Screenshots / clips

<!-- Required for any UI / animation change. Drag-drop a screen recording or PNG. Delete this section for non-UI PRs. -->

## Checklist

- [ ] `bun run check` passes (presence + forbidden + freshness + api-surface)
- [ ] `bun run typecheck` passes
- [ ] CI `hygiene` job is green on this PR
- [ ] Updated relevant `AGENTS.md` if I changed structure or conventions in that directory
- [ ] Logged an ADR in `docs/decisions/` if this was a structural decision or an API surface change
- [ ] Working in a dedicated worktree (`bun run wt:add`) if any other agent session is active
