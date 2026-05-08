# AGENTS.md — `docs/media/`

Static media (GIFs, screenshots, recordings) referenced from PR descriptions, the README, and ADRs. Anything embedded into prose lives here so it can be reviewed alongside the code change that introduced it, instead of relying on third-party hosts that decay.

## Index

| File | Purpose |
|---|---|
| `breakapart-demo.gif` | 4-second loop of the breakapart-svg demo. Embedded in PR #19 / ADR 0020. 720p, 15 fps, 32-color palette. |

## Rules

- **Capture from the actual built output**, not a mockup. If the demo changes, re-record.
- **Optimise for review weight, not archival fidelity.** Keep individual files under ~1 MB where possible — palette-reduce, drop fps, scale down. Reviewers should see the change without slow page loads.
- **Reference media via raw GitHub URLs from the PR branch** (`https://github.com/<owner>/<repo>/raw/<branch>/docs/media/<file>`) so the embed shows the exact frame on the open PR. Once merged, the URL stays valid against `main`.
- **Don't commit very large recordings.** A 30-second 4K capture belongs nowhere in the repo. If you need long-form video, host externally and link.

## What does NOT belong here

- Asset source files for examples (those live with the example).
- Generated screenshots from CI test runs (those are workflow artefacts).
- Personal scratch images.

---

<!-- last-reviewed: c70879b -->
