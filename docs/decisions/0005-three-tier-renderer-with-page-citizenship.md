# ADR 0005: Three-tier pluggable renderer with a page-citizenship layer

## Status

Accepted — 2026-04-25

## Context

Tessera's wedge is "the same scene description renders from a 30-rect SVG marketing hero up to a million-particle WebGL2 sim." That requires a single scene model rendered by multiple backends, and a survey of existing libraries shows none cover this niche:

- **PixiJS v8** — closest in capability; WebGPU + WebGL2 renderers, both feature-complete. But its scene graph is its own; cannot drop to SVG for a 30-cell hero. No native cell-grid primitive (everything is `Sprite`/`Container`). No page-citizenship defaults.
- **Phaser / Excalibur** — full game engines that want to own the page. Architectural overkill for a marketing hero.
- **tsparticles, Pixi-particles** — particle libraries that aren't entity-aware; bolt-on, not unified.
- **No common framework** ships renderer-agnostic abstraction where the same scene description maps to SVG (low-count, accessible), Canvas2D (medium), and WebGL2 (game-scale).

Performance reality (verified with current benchmarks):

- **Canvas2D / CPU-JS:** ~5k–10k particles before frame drops
- **WebGL2 + transform feedback:** ~300k–2M particles at 60fps (universal since 2021)
- **WebGPU + compute shaders:** ~20–37M particles on desktop GPUs; 1M particles in <2ms; ~50% more battery-efficient than WebGL on mobile compute workloads

Mobile coverage in 2026: WebGL2 universal; WebGPU on iOS 26 / Safari 26, Chrome Android 121+ on Android 12+, Firefox 147 desktop. Firefox Android still flagged.

## Decision

Three pluggable renderer tiers behind a shared `Renderer` interface, with a renderer-agnostic page-citizenship layer above all of them:

| Tier | Best for | Cell ceiling | Particles | Status |
|---|---|---|---|---|
| 1: SVG | Marketing heroes, accessible scenes | ~500 | No | v0.1 |
| 2: Canvas2D | Prototypes, medium scenes | ~10k | ~5k CPU | v0.2 |
| 3: WebGL2 | Games, particle sims | ~1M | ~1M (transform feedback) | v0.3 |
| 4: WebGPU | Compute-heavy sim | many millions | ~10M+ | post-v1 |

The page-citizenship layer (universal, runs above any tier):

- IntersectionObserver pause-when-offscreen
- `prefers-reduced-motion` honored by default
- Battery / `prefers-reduced-data` throttling
- Frame-budget meter — auto-downgrades particle counts when frametime spikes (mobile thermal throttling)

Auto-selection on `createScene()` picks the lowest tier that satisfies the scene's complexity + capability detection + `prefers-reduced-motion`. User can pin (`renderer: 'svg'`) for accessibility/marketing-page reasons.

## Consequences

- **Pro:** This is the only shape that lets MotionPitch's mug (30 rects, page-embedded, accessible) and a million-particle hero exist in the same framework without rewrites.
- **Pro:** Tier 1 (SVG) ships in v0.1 — fast, demo-able, low-risk. Tier 3 (WebGL2) makes the "full particle sim, no lag" claim real *and universal* in mobile coverage.
- **Pro:** The page-citizenship layer is a real differentiator — no existing library does this well — and it lives renderer-agnostically above the tiers.
- **Pro:** WebGPU as Tier 4 future-proofs without becoming a launch dependency.
- **Con:** Maintaining three renderers is more work than picking one. Mitigated by the pluggable interface — each tier is independently shippable, and userland code doesn't change between them.
- **Con:** The `Renderer` interface design is load-bearing. Getting it wrong forces a v2 rewrite. Mitigated by porting the MotionPitch mug as the v0.1 regression test before committing the surface.

## Alternatives considered

- **WebGL2-only ("just do one thing well")** — defensible and narrower, but loses the marketing-hero / accessibility tier and the entire MotionPitch lineage. Rejected.
- **Pixi as renderer** — adds a hard runtime dep, ties us to its scene graph, and doesn't solve SVG / accessibility / page-citizenship. Rejected.
- **WebGPU-first** — coverage gap on mobile (Firefox Android, older iOS) makes "no lag, universal" claims false today. Rejected as launch target; kept as Tier 4 future.
- **Renderer chosen at compile time, not at construction** — simpler but kills the "scene grows from page hero to full sim" story. Rejected.
