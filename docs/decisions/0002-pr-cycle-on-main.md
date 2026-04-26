# ADR 0002: All changes go through PRs against a branch-protected `main`

## Status

Accepted — 2026-04-25

## Context

Tessera is intended as a public OSS framework with downstream consumers. `main` must always be green: CI passing, examples building, public API stable. Direct pushes to `main` make it easy to land partial work, skip review, or break consumers in between releases.

Solo development is common — Lance is the only committer at bootstrap — but the tooling discipline still pays off: every change has a paper trail, every change is gated by CI, and the squash-merged history reads as a sequence of intentional features rather than a stream of WIP commits.

## Decision

`main` is branch-protected on GitHub with:

- **Required status check:** `hygiene` job (runs on every push and PR)
- **Required PR before merge:** approval count = 0 (solo-friendly), but the PR is mandatory
- **`enforce_admins: true`:** owner cannot bypass without explicitly disabling protection
- **No force pushes, no deletions**

Bootstrap commits (the very first commits creating the repo and the dev substrate) are the documented exception — they land on `main` directly because branch protection cannot be applied until the first commit exists. After bootstrap, protection is applied and the rule kicks in.

Workflow:

```
main (protected)
  ├── feat/<slug>   →  push  →  gh pr create  →  CI green  →  squash-merge
  ├── fix/<slug>    →  ...                                          ↑
  └── docs/<slug>   →  ...                                          ↑
                                                                 (history stays
                                                                  one commit per PR)
```

The full procedure lives in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#pull-requests). The protection JSON lives in [`.github/branch-protection.json`](../../.github/branch-protection.json) for re-application after any break-glass.

## Consequences

- **Pro:** No accidental pushes to `main`. Every change has a PR with a self-review checklist.
- **Pro:** CI failure surfaces in the PR before merge — `main` stays releasable at all times.
- **Pro:** Squash-merge keeps the `main` history readable as a feature log.
- **Pro:** Branch protection JSON is version-controlled — settings can't drift unnoticed.
- **Con:** Extra ~30 seconds per change (push, open PR, wait for CI, merge). Acceptable; CI runs in ~10s.
- **Con:** Solo dev with `enforce_admins: true` means an emergency bypass requires temporarily disabling protection. Documented in CONTRIBUTING; the friction is intentional.

## Alternatives considered

- **No protection, just convention** — relies on memory; one missed step away from a regression on `main`. Rejected.
- **Require approvals (≥1)** — would block solo work entirely. Rejected.
- **Allow admin bypass (`enforce_admins: false`)** — defeats the point for a solo-dev where the dev is the only admin. Rejected.
- **Rebase-merge instead of squash-merge** — keeps individual WIP commits in `main` history. For an OSS framework with a CHANGELOG that maps to PR titles, squash is cleaner. Rejected.
