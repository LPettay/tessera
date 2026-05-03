# AGENTS.md — `examples/landing-svg/`

Stylized voxel-cell landing page. The README's wedge in concrete form: same primitives that build a JRPG inventory menu also build a marketing hero.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Composed `Scene` — bg Layer (panel + drifting sparkles) + content Layer (nav, hero title with glow, three feature cards with pulsing accents, footer with fading CTA). |
| `main.ts` | Browser entry. |
| `index.html` | Static page. |
| `dev.ts` | `bun run dev:landing` on port 3003. |
| `build.ts` | `bun run build:landing` → `dist/landing/`. |

## Rules

- **Imports come from `../../src/index.ts` only.**
- **One animation per entity.** The hero "title with glow" effect is built by stacking a fading glow Entity behind a pulsing title Entity at the same position.

## How to verify locally

```bash
bun run dev:landing
# open http://localhost:3003
# expected:
#   - nav bar at top with logo (oscillate-Y) and 4 bobbing icons
#   - hero T-mark in the center pulsing 1.0 ↔ 1.05 with a fading glow halo behind
#   - 3 feature cards in a row, each with a corner accent dot pulsing on a stagger
#   - footer with a fading "subscribe" CTA bar
#   - 6 sparkles drifting through the hero region
```

## What's intentionally minimal

- **No typography.** "Text" is suggested with thin pixel rows; readers infer copy. A real landing page would want a pixel-font generator.
- **No interaction.** Static demo — no scroll, no click handlers.
- **No real responsive layout.** The Scene description is pixel-anchored to a 100×56 cell grid; the demo crops via `preserveAspectRatio: slice`.

---

<!-- last-reviewed: 0e742dd -->
