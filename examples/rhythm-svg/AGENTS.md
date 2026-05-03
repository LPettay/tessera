# AGENTS.md — `examples/rhythm-svg/`

Rhythm-game HUD. Densest of the v0.2.x demos — exercises every Animation kind (`spin`, `drift`, `pulse`, `bob`, `fade`, `oscillate`) in a single frame, including a vector spinning receptor target per ADR 0014.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Three layers: bg (frame, sparkles, EQ visualizer bars), playfield (lanes + drifting notes + spinning receptors), HUD (score, combo, groove bar, side avatars, press-beat cursor). 120×60 cell grid. |
| `main.ts` | Browser entry. |
| `index.html` | Static page; near-black background. |
| `dev.ts` | `bun run dev:rhythm` on port 3004. |
| `build.ts` | `bun run build:rhythm` → `dist/rhythm/`. |

## Rules

- **Imports come from `../../src/index.ts` only.**
- **Receptors are vector entities, not voxel-sprites.** Spinning a voxel-sprite produces tilted parallelograms (intentional for small Y-oscillation; visually wrong for in-plane spin per ADR 0014). Cross-shaped receptors use the vector kind so the per-frame rasterization keeps cells axis-aligned.
- **One animation per entity.** Receptors get spin; their pulsing core is a separate sprite at the same position. Notes use drift only; visual rim/highlight is baked into the sprite cells, not stacked entities.

## How to verify locally

```bash
bun run dev:rhythm
# open http://localhost:3004
# expected:
#   - 4 vertical lanes mid-screen
#   - 4 spinning + crosses at the lane bottoms (vector spin, axis-aligned)
#   - 4 pulsing core dots over the spinning targets
#   - 12 notes drifting downward at varied speeds
#   - score block top-left with a pulsing accent dot
#   - combo block top-right with a pulsing number tile
#   - groove bar mid-bottom with a fading tip pulse
#   - two avatars left/right bobbing
#   - "press beat" cursor under the lanes fading
#   - 12 EQ visualizer bars on the side edges pulsing
#   - 6 sparkles drifting top-to-bottom
```

## What's intentionally minimal

- **No actual rhythm logic.** Notes drift past the receptors and off the screen; nothing reacts to keypresses. Game logic is post-v0.x.
- **No real digits.** Score and combo "numbers" are pixel blocks reading as digits, not a font.
- **EQ bars use uniform pulse, not vertical-only scale.** Tessera's `pulse` is uniform scale; non-uniform scale is a future kind. The effect reads but isn't a true frequency visualizer.

---

<!-- last-reviewed: 0e742dd -->
