# AGENTS.md — `src/core/`

Engine core. **Vanilla TypeScript, zero runtime dependencies, no React, no DOM-only assumptions.** Must run in Node (for tests), in the browser, and in a Worker (for OffscreenCanvas rendering in Tier 3+).

## Index

### Files here

| File | Purpose |
|---|---|
| `scene.ts` | Scene description language — `Scene`, `Layer`, `Cell`, `Entity`, `EntityShape`, `VoxelSpriteCell`, `Animation`. Pure data types, no behavior. |
| `renderer.ts` | Renderer contract — `Renderer`, `RendererCapabilities`, `RendererController`, `RendererTier`. The interface every renderer tier implements. |

### Planned (not yet created)

| File | Purpose | Tracked in |
|---|---|---|
| `mount.ts` | Auto-selecting `mount()` factory — picks the lowest renderer tier that can render the given scene | ADR 0005 |
| `page-citizenship.ts` | IntersectionObserver pause, prefers-reduced-motion, battery throttling, frame-budget meter | ADR 0005, milestone v0.1 |

## Rules

- **Zero runtime dependencies.** Stdlib types only. Renderers may have deps; core may not.
- **No React.** Not as type, not at runtime. React lives only in `src/adapters/react/`.
- **No DOM-only assumptions in types.** `mount()` takes `HTMLElement` (DOM) but the scene model itself never references DOM types.
- **No imports from `src/renderers/`.** Core defines the interface; renderers implement it. Dependency direction is one-way: renderers → core.
- **Pure-data types, no methods.** `Scene`, `Layer`, `Cell`, etc. are plain object literals — no classes, no behavior. This keeps them serializable (Worker transfer, file format later) and trivially testable.

## What does NOT live here

- Renderer implementations → `src/renderers/{svg,canvas2d,webgl2}/`
- React component / hooks → `src/adapters/react/`
- Page-citizenship runtime (when it lands) → still here, but as renderer-agnostic logic

## Testing

Tests for `src/core/` must run in Node without a DOM. If a test needs DOM, the code under test belongs in a renderer or adapter, not in core.

---

<!-- last-reviewed: 9f81cf4 -->
