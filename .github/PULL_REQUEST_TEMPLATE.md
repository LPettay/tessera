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

## Screenshots / clips — before & after

<!--
Required for any UI / animation / rendering change.

Commit screenshots to docs/screenshots/ as adr-NNNN-*.png (or pr-NNN-*.png
if no ADR), then embed them here. Capture BOTH before and after at matched
timestamps so rotation / motion stages correspond. See CONTRIBUTING.md
("Visual evidence for visual changes") and docs/screenshots/AGENTS.md.

Delete this section for non-UI PRs.
-->

**Before:**

<!-- ![before-1](../docs/screenshots/adr-NNNN-before-...png) -->

**After:**

<!-- ![after-1](../docs/screenshots/adr-NNNN-after-...png) -->

## Checklist

- [ ] `bun run check` passes (presence + forbidden + freshness + api-surface)
- [ ] `bun run typecheck` passes
- [ ] CI `hygiene` job is green on this PR
- [ ] Updated relevant `AGENTS.md` if I changed structure or conventions in that directory
- [ ] Logged an ADR in `docs/decisions/` if this was a structural decision or an API surface change
- [ ] Working in a dedicated worktree (`bun run wt:add`) if any other agent session is active
- [ ] If visual: before/after screenshots committed to `docs/screenshots/` and embedded above
