# ADR 0004: Every `AGENTS.md` carries a navigable Index

## Status

Accepted — 2026-04-25

## Context

The dev substrate carries multiple `AGENTS.md` files (one per meaningful directory, plus root). Two consistent failure modes were observed on the predecessor repo:

1. **No crawl map at the root.** A fresh agent landing in the repo had no single doc that pointed at every other `AGENTS.md`. To learn the layout it had to either `ls -R` (token-expensive) or read prose trees in the README (purpose-light).
2. **"Expected files" tables conflated present and planned.** Several `src/*/AGENTS.md` files listed files like `openai.ts`, `LandingPage.tsx`, etc. as if they existed. They didn't. A fresh agent burned `Read` calls trying to open files that hadn't been written yet.

The Index convention in this ADR fixes both.

## Decision

Every `AGENTS.md` carries an **Index** section near the top with up to three sub-tables, including only the ones that apply:

```markdown
## Index

### Files here
| File | Purpose |
|---|---|
| `foo.ts` | Single-sentence purpose |

### Subdirectories
| Dir | AGENTS.md | Purpose |
|---|---|---|
| `lib/` | [`lib/AGENTS.md`](./lib/AGENTS.md) | Single-sentence purpose |

### Planned (not yet created)
| File | Purpose | Tracked in |
|---|---|---|
| `webgl-renderer.ts` | Tier 3 implementation | docs/architecture.md |
```

The **root `AGENTS.md`** additionally carries a **Crawl map** — a single ASCII tree of every `AGENTS.md` in the repo with a one-line purpose for each — so an agent can decide where to crawl from one read.

New `AGENTS.md` files MUST follow the convention.

## Consequences

- **Pro:** Fresh-agent orientation goes from N reads (one per AGENTS.md) to 1 read (the root crawl map) plus targeted follow-ups.
- **Pro:** Splitting "Files here" from "Planned" stops agents from wasting `Read` calls on non-existent files.
- **Pro:** The Index becomes a forcing function for documentation: when a new file is added without an Index entry, the omission is visible at a glance.
- **Con:** Slightly more boilerplate per `AGENTS.md`. Acceptable; each Index is < 20 lines.
- **Con:** Convention is enforced by review only for now (not by `bun run check`). If it drifts we can add a `check-index.ts` later.

## Alternatives considered

- **Per-file `// AGENT-NOTE` headers in source files** — denser but invisible at the directory level; would not produce a crawl map. Rejected.
- **A single top-level `INDEX.md` instead of per-directory Index sections** — centralizes the map but defeats the locality of `AGENTS.md`. Rejected.
- **Generate the Index sections from the filesystem** — tempting, but the per-file *purpose* sentences are exactly the part a script can't write. Rejected for now.
