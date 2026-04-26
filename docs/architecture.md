# Architecture

Tessera renders **layered 2D voxel scenes** through a **pluggable renderer interface** with a **page-citizenship layer** that works regardless of which renderer is active.

## High-level shape

```
┌─ Page-citizenship layer (universal) ─────────────────────────┐
│  IntersectionObserver pause · prefers-reduced-motion         │
│  battery/thermal hints · frame-budget meter                  │
├─ Scene model (renderer-agnostic) ────────────────────────────┤
│  Scene → Layer[] → Cell[] + Entity[] + ParticleSystem[]     │
├─ Renderer interface ─────────────────────────────────────────┤
│  draw(scene), tick(dt), capabilities, dispose                │
├─ Tier 1: SVG ──┬─ Tier 2: Canvas2D ─┬─ Tier 3: WebGL2 ───────┤
│  <500 cells    │ 500–10k cells      │ 10k–1M cells           │
│  Page heroes   │ Prototypes         │ Particles, games       │
│  Accessible    │ No GPU needed      │ Universal mobile        │
└────────────────┴────────────────────┴─────────────────────────┘
                                          ↑ planned: Tier 4 WebGPU
```

## Scene model

A **Scene** is an ordered list of **Layer**s. Each Layer has:

- A fixed cell grid (`cellSize`, `width`, `height`)
- Per-cell visual state (color, sprite-index, opacity)
- Zero or more **Entity** objects positioned by cell coordinate, free to span cells, animate, and respond to inputs
- Zero or more **ParticleSystem** objects (Tier 3+ only)

Layers stack with z-order, opacity, and parallax. Entities can sit between layers.

## Renderer interface

Every renderer implements the same surface:

```ts
interface Renderer {
  capabilities: RendererCapabilities;  // max cells, particle support, etc.
  mount(container: HTMLElement): void;
  draw(scene: Scene): void;
  tick(deltaMs: number): void;
  dispose(): void;
}
```

Userland code never depends on a specific renderer. The `createScene()` factory chooses a renderer based on capability detection + scene complexity, or accepts an explicit `renderer: 'svg' | 'canvas2d' | 'webgl2'` pin.

## Renderer tiers

| Tier | Best for | Cell ceiling | Particles | Mobile | Why |
|---|---|---|---|---|---|
| 1: SVG | Marketing heroes, accessible scenes | ~500 | No | Universal | DOM nodes, accessible, debuggable |
| 2: Canvas2D | Prototypes, medium scenes | ~10k | ~5k CPU-side | Universal | No GPU required, dirty-rect optimization |
| 3: WebGL2 | Games, particle sims | ~1M | ~1M (transform feedback) | Universal since 2021 | Instanced chunks + GPU sim |
| 4: WebGPU *(planned)* | Compute-heavy sim | many millions | ~10M+ (compute shaders) | Chrome ≥121, Safari 26+, Firefox 147+ | Compute shader access |

Rationale for the tiered approach: see [ADR 0005](./decisions/0005-three-tier-renderer-with-page-citizenship.md).

## Page-citizenship layer

Lives above all renderers. Universal defaults:

- **Pause when offscreen** via IntersectionObserver
- **Throttle to 30fps on battery saver** via `navigator.getBattery()` and `prefers-reduced-data`
- **Honor `prefers-reduced-motion`** by default
- **Frame-budget meter** auto-downgrades particle counts when frametime spikes (mobile thermal throttling)

Users can override per-scene, but defaults assume "this is a citizen on someone's page, not the only thing running."

## Runtime split

- **`src/core/`** — engine. Vanilla TS, zero runtime deps, no React. Renderer-agnostic.
- **`src/renderers/{svg,canvas2d,webgl2}/`** — renderer implementations, each independently shippable.
- **`src/adapters/react/`** — React wrapper (`<TesseraScene />`, hooks). Vue/Solid/web-components adapters land later as separate packages.

Rationale: see [ADR 0006](./decisions/0006-vanilla-core-react-adapter.md).

## Status & milestones

- **v0** *(current)* — dev substrate only. `src/` is a placeholder.
- **v0.1** — SVG renderer + scene model + one entity + page-citizenship layer. MotionPitch coffee-mug as first example.
- **v0.2** — Canvas2D renderer, multi-layer scenes.
- **v0.3** — WebGL2 renderer, sprite-stacking primitives, basic particles.
- **v0.4** — Particle systems with transform-feedback simulation.
- **post-v1** — WebGPU, editor, Vue/Solid adapters.

The firewall in [`AGENTS.md`](../AGENTS.md#anti-scope-creep-firewall-milestone-scoped) enforces these boundaries per milestone.
