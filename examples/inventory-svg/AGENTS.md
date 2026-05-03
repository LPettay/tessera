# AGENTS.md — `examples/inventory-svg/`

JRPG-style inventory / status screen. Demonstrates the v0.2.x Animation kinds in a denser, panel-rich layout — closer to a real game UI than the mug-svg or menu-svg demos.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Composed `Scene` — frame Layer (panels + drifting dust) + content Layer (portrait, plume, name plate, HP warning, equipment grid, action menu, dialogue). All cell data inline; helpers (`rect`, `panel`) keep authoring concise. |
| `main.ts` | Browser entry — same boilerplate as the other SVG examples. |
| `index.html` | Static page; deep-navy background to match the panel palette. |
| `dev.ts` | `bun run dev:inventory` on port 3002. |
| `build.ts` | `bun run build:inventory` → `dist/inventory/`. |

## Rules

- **Imports come from `../../src/index.ts` only.**
- **One animation per entity.** Stacked behaviors are faked by splitting into multiple entities at slightly different positions (e.g., the HP warning is a separate fading entity overlaid on the static HP bar).
- **Panel fills go in voxel-sprite Entities, not Layer.cells.** `Layer.cells` only takes single-cell `Cell` entries; multi-cell `w`/`h` rects are a voxel-sprite shape feature.

## How to verify locally

```bash
bun run dev:inventory
# open http://localhost:3002
# expected:
#   - panel frame fills the viewport, slot grid + action menu rendered
#   - helmet plume on the portrait sways (oscillate-Y)
#   - selection cursor next to the first menu row pulses
#   - 6 equipment-slot icons bob with staggered durations
#   - red HP-low overlay fades on top of the HP bar
#   - dialogue continue arrow at the bottom-right fades
#   - ~4 background sparkles drift across the frame
```

## What's intentionally minimal

- **No real text glyphs.** Tessera renders voxel cells; "text" is suggested with thin pixel blocks that the reader interprets as labels. A pixel-font generator is a possible future primitive.
- **Static stats values.** No HUD wiring to a game model — the numbers don't change. The demo's job is to exercise the animation kinds and panel layout, not simulate a game.
- **No interaction.** Selection cursor is locked to the top action; clicks/keys aren't wired. Input handling is post-v0.x.

---

<!-- last-reviewed: 0e742dd -->
