# AGENTS.md — `src/generators/`

Hand-crafted `BackgroundGenerator` implementations. Each generator is its own subdirectory exporting a typed `(config, geometry) → { cells, entities }` function.

## Index

### Subdirectories

| Dir | AGENTS.md | Purpose |
|---|---|---|
| `sunburst/` | [`sunburst/AGENTS.md`](./sunburst/AGENTS.md) | Quantized radial gradient + rotating vector-ray overlay. v0.2.0 first concrete generator. |

### Planned (not yet created)

| Dir | Purpose | Tracked in |
|---|---|---|
| `halftone/` | Halftone-dot density gradient — second v0.2 generator, validates the abstraction across visually-distinct shapes | v0.2.1 milestone |

## Cross-cutting rules

- **Each generator is its own directory** with `<name>.ts` (function + Config type), `index.ts` (re-exports), `AGENTS.md`.
- **Pure & sync.** Per ADR 0013: no DOM, no I/O, no `Math.random` without a seeded RNG in Config. Generators must run in Node and Workers.
- **Generators import from `../../index.ts` only** (the public API). They do *not* reach into `core/` directly. The generator surface should be exactly what users have available; reaching past the boundary would let templates use private internals.
- **Config types are exported.** Each generator declares its `<Name>Config` type and re-exports it from its `index.ts`. Future LLM bridge (v0.3) consumes these via Zod schemas.
- **No shared state between generators.** A generator is a pure function — no mutable state, no init step, no module-level effects.

## Adding a new generator

1. Create `src/generators/<name>/` with `<name>.ts`, `index.ts`, `AGENTS.md`.
2. Implement `<name>Generator: BackgroundGenerator<<Name>Config>`.
3. Re-export from `src/index.ts` so it's part of the public surface.
4. Update `docs/api-surface.txt` (sorted) and add an ADR if the generator introduces a new design pattern (most won't).
5. Add an example or preset in the demo so the generator is exercised in CI's bundle.

---

<!-- last-reviewed: 8fdbcef -->
