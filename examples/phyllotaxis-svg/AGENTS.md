# examples/phyllotaxis-svg — Agent Guide

**Purpose:** Demonstrate `phyllotaxisGenerator` with a cursor-repulsion field.
Every dot in the scene is placed by the golden-angle formula; moving the cursor
parts the spiral.

**Stamp:** <!-- STAMP:PLACEHOLDER -->

---

## File map

| File | Role |
|------|------|
| `index.html` | Page shell — dark background, brand label, hint text |
| `scene.ts` | Builds the `Scene` via `phyllotaxisGenerator`; exports `CELL_SIZE` and `buildPhyllotaxisScene(dims)` |
| `main.ts` | Mounts renderer, computes dims from container, installs cursor field |
| `dev.ts` | Bun dev server on port 3008 |
| `build.ts` | Static bundle → `dist/phyllotaxis/` |

---

## Key invariants

- `scene.ts` imports only from `../../src/index.ts` — no internal imports.
- `main.ts` computes `width/height` from `container.clientWidth/clientHeight` at
  mount time — the scene fills any viewport.
- Dot entities are emitted with ids `phyllotaxis.dot.{n}` — the cursor field
  addresses them by id without knowing their count.
- `count ≈ width × height × 0.4` at `dotScale 2.2` fills the viewport; adjust
  together if either changes.

---

## Rules

1. No hand-authored pixel art — the generator owns all dot placement.
2. No hard-coded width/height in `scene.ts` — always accept `Dims`.
3. Cursor field radius and maxDisplacement are the tuning knobs; keep them in
   `main.ts`, not `scene.ts`.

---

<!-- last-reviewed: 12eb28d -->
