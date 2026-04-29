# AGENTS.md — `docs/screenshots/`

Visual evidence captured for ADRs and PRs. Each image is named `adr-NNNN-<short-description>.png` so the file pairs cleanly with the ADR or PR it supports.

## Naming convention

```
adr-0014-before-voxel-sprite-spin.png    # before/after for ADR 0014
adr-0014-rays-at-60deg.png               # angle-specific captures
```

Use `adr-NNNN-` even when the screenshot accompanies a PR rather than an ADR — the ADR is the durable artifact, the PR is its review surface.

## When to add a screenshot here

Per [`CONTRIBUTING.md`](../../CONTRIBUTING.md), any PR with visual changes should include before/after screenshots. Commit them to this directory, reference them from both the ADR and the PR description.

## What does NOT live here

- Ephemeral debugging captures — keep those in `/tmp` or your local machine.
- High-resolution marketing assets — those belong in the eventual `site/` workspace, not in the repo's docs directory.
- Animated `.gif` or `.webm` recordings — for now, multiple still frames at different time points are preferred (smaller diffs, easier to review).

## Image budget

Keep individual screenshots under ~50KB. Crop to the relevant region; don't ship 1280×800 PNGs of mostly-black space if a 600×600 crop tells the same story. Use PNG for pixel-art (lossless, small palette compresses well).

---

<!-- last-reviewed: 1c57fa6 -->
