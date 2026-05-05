# AGENTS.md — `examples/menu-svg/`

A stylized title-screen scene exercising the v0.2.x non-rotation `Animation` leaf kinds (ADR 0016): `pulse`, `bob`, `fade`, `drift`. Acts as a regression test for those kinds the same way `mug-svg` does for `oscillate` + `spin`.

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Composed `Scene` — drifting sparkles Layer + foreground Layer with pulsing sun, bobbing menu icons, fading press-start cursor. All cell data inline. |
| `main.ts` | Browser entry — mounts `svgRenderer` on `#scene`, wraps with `withPageCitizenship`, sets full-viewport `preserveAspectRatio`. |
| `index.html` | Static page that hosts the demo. Deep-navy background; tiny brand label in the corner. |
| `dev.ts` | `Bun.serve` dev server — bundles `main.ts` on demand. Run via `bun run dev:menu`. Default port 3001 (mug-svg owns 3000). |
| `build.ts` | Static build — produces `dist/menu/index.html` + `dist/menu/main.js`. Run via `bun run build:menu`. |

## Rules

- **Imports come from `../../src/index.ts` only.** Same boundary as mug-svg.
- **One animation per entity.** Composition isn't shipped yet (its own future ADR). Don't fake parallel composition with workarounds; the demo's job is to show the leaf kinds honestly.
- **Scene authoring stays in `scene.ts`.**

## How to verify locally

```bash
bun run dev:menu
# open http://localhost:3001
# expected:
#   - sparkles drift across the layer in varied directions (drift)
#   - central diamond sun pulses subtly, ~1.8s period (pulse)
#   - three menu icons bob vertically with staggered durations (bob)
#   - "press start" bar near the bottom fades 0.2 ↔ 1.0 (fade)
# switch tabs / scroll away → all animations pause
# OS reduced-motion → all freeze
```

## What's intentionally missing

- **Composition.** A real title screen would have icons that bob *and* pulse on hover. Today each entity gets one animation. The composition ADR will fix this.
- **Sparkle wraparound.** `drift` is unbounded — sparkles eventually leave the viewport. Faking a wraparound effect would require either a periodic kind (different design) or scene-level reset logic. Out of scope.
- **Easing variety.** All bounded kinds use sine easing. Custom easing (`linear`, `ease-out`, etc.) lands with a future tween kind.

## Why this example exists alongside mug-svg

Different concerns. `mug-svg` is the v0.1 regression test for rotation animation (`oscillate` + `spin`) and the original MotionPitch port. `menu-svg` is the v0.2.x regression test for the non-rotation leaf kinds. Splitting keeps each example focused on one Animation family, and keeps the per-example scene-authoring footprint small.

---

<!-- last-reviewed: 1973dcc -->
