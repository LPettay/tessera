# AGENTS.md — `docs/`

Living documentation for Tessera. Read these before making structural decisions.

## Index

### Files here

| File | Purpose |
|---|---|
| `architecture.md` | High-level system diagram, renderer tiers, data flow |

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `decisions/` | [`decisions/AGENTS.md`](./decisions/AGENTS.md) | ADRs (Architecture Decision Records) — one short markdown per structural choice |

### Planned (not yet created)

| File | Purpose | Tracked in |
|---|---|---|
| `api-surface.txt` | Stamped snapshot of `src/index.ts` re-exports; gated by `check-api-surface` | ADR 0007 |

## Rules

- **Update `architecture.md`** when you add/remove a directory or change the data flow / renderer tiering.
- **Append a new ADR** when you make a structural choice (new dep, new pattern, API surface change).
- **Never delete an ADR.** Mark it `Superseded` and write the new one. The history is the value.

## ADR format

Files in `decisions/` are numbered: `0001-...`, `0002-...`. Each is short (under a screen). Required sections: Status, Context, Decision, Consequences. Optional: Alternatives considered. See [`decisions/0000-template.md`](./decisions/0000-template.md).

---

<!-- last-reviewed: c01ed48 -->
