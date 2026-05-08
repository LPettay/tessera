# ADR 0022 — Cell drawing helpers (L1)

**Status:** Accepted
**Date:** 2026-05-08

## Context

ADR 0021 names L1 in the abstraction stack as "drawing helpers — pure functions emitting `VoxelSpriteCell[]`." Without these, every scene author hand-codes nested loops to fill rectangles, draw outlines, and interpolate gradients. The breakapart, rhythm, and inventory demos all carry inline grid loops; the upcoming Windows-replica demo would explode with them.

This ADR adds the smallest L1 surface that covers the patterns we already see in shipped demos and that the Windows demo immediately needs.

## Decision

A new module `src/core/draw.ts` exports five pure functions:

```ts
rect(x, y, w, h, fill): VoxelSpriteCell[]
grid(x, y, w, h, fill): VoxelSpriteCell[]
outline(x, y, w, h, fill, thickness?): VoxelSpriteCell[]
gradient(x, y, w, h, from, to, direction): VoxelSpriteCell[]
lerpColor(from, to, t): string
```

All are added to the public API (`src/index.ts`).

### `rect` vs `grid` — the cheap/addressable distinction

The most important design call is having **two ways to fill an area**:

- **`rect`** emits one `VoxelSpriteCell` with `w` and `h` set. The renderer draws a single SVG `<rect>`. Cheap. The whole region animates as one unit and cannot be addressed per-cell.
- **`grid`** emits `w × h` separate unit cells. Each is individually addressable — animations and (future) fields can move each cell independently. The cost is `w × h` cells in the scene.

This corresponds to a real call-site decision: the taskbar background is a `rect` (purely visual), but a window title bar that should dissolve under the cursor is a `grid`. Hiding the choice from the author would either leave performance on the floor (always-grid) or block the cursor-repulsion demo (always-rect).

### `outline` thickness, edge cases

`thickness` defaults to 1. When `thickness * 2 >= min(w, h)`, the outline degenerates to a solid grid — graceful, but probably a bug at the call site. We chose graceful over throwing because outline-as-fill is a legitimate (if rare) effect for very small regions.

### `gradient` direction

`"horizontal" | "vertical"` only. Diagonal gradients are deferred — they need an angle parameter and the math is messier (rotated UV space, anti-aliasing trade-offs against the integer grid). YAGNI for the Windows demo, which only needs vertical title-bar gradients.

### `lerpColor` strictness

Accepts `#rrggbb` only. Short-form (`#rgb`), CSS named colours, and `rgba()` are explicitly out of scope — `Cell.fill` is documented as `#rrggbb` everywhere else, and supporting alternates would create a leaky parser surface across the codebase. Garbage in produces `#NaNNaNNaN` which fails fast at the renderer.

## Alternatives considered

**Single `fill(x, y, w, h, fill, opts?)` with a `granularity` option.** Rejected. Two functions with crisp names beat one function with a flag. The cheap-vs-addressable choice is a real decision at every call site, not an opt-in.

**Namespaced under a `draw` object** (`draw.rect`, `draw.outline`). Rejected. The framework's existing convention is top-level exports (`rasterizeText`, `measureText`, `svgRenderer`). Consistency over namespacing.

**Deferred until the Windows demo demands it.** Rejected. The demo already needs these and so does the next ADR (scene fragments) for examples. Landing helpers and fragments in one PR conflates two separate decisions.

**Diagonal gradient + radial gradient kinds in this PR.** Rejected. YAGNI. Easy to add in a follow-up if a demo actually wants them.

**Anti-aliased outline / sub-cell stroke widths.** Rejected. The framework's atom is the discrete cell (ADR 0021); sub-cell rendering is outside L1's job. If anti-aliased strokes ever matter, they belong in a vector-shape extension (ADR 0014's territory), not here.

## Consequences

- **Public API gains five names.** All listed in `docs/api-surface.txt`.
- **Existing scenes do not change.** Helpers are additive; nothing is rewritten in this PR. Where existing demos hand-roll equivalent loops (rhythm, inventory, breakapart), refactoring to use the helpers can land later if the diff is worth it.
- **Future ADRs (0023 fragments, Windows demo) can lean on these.** "A `Window` component returns a fragment containing `[...gradient(...), ...outline(...), ...grid(...)]`" — the next layer's mental model becomes immediately legible.
- **`rect` returning an array of one cell** keeps the composition pattern uniform (`[...rect(...), ...grid(...)]`). Authors don't have to remember which helper returns one vs many.

## What this doesn't decide

- Scene fragments / component composition (ADR 0023)
- Layout helpers — `hstack`, `vstack`, `grid` of components (TBD, possibly ADR 0026)
- Theme tokens (TBD)
- The `onFrame` interactivity hook (ADR 0024)
- Anti-aliased or sub-cell drawing primitives (out of scope per ADR 0021's atom decision)
