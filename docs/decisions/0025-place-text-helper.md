# ADR 0025 — `placeText` drawing helper

**Status:** Accepted  
**Layer:** L1 (drawing helpers)  
**Deciders:** Lance Pettay  

---

## Context

`rasterizeText` emits cells in entity-local coordinates starting at (0, 0). Positioning
the result at a world coordinate requires a `.map()` offset every call site:

```ts
rasterizeText({ kind: "text", text, fill, scale }).map((c) => ({
  ...c,
  x: c.x + originX,
  y: c.y + originY,
}));
```

This pattern appeared in every scene component that renders text (START label, clock,
window title, body text, desktop icon labels — five sites in `windows-svg` alone).
Each repetition is boilerplate with no local meaning; the intent is always "place this
text at (x, y)".

## Decision

Add `placeText(text, x, y, scale, fill): VoxelSpriteCell[]` to `src/core/text.ts` and
export it from the public API.

Signature mirrors the draw.ts positional convention (`x, y` before visual properties)
and keeps the common case (single-scale, single-color text) as a one-liner. Callers
needing `letterSpacing`, `lineSpacing`, or pivot can still use `rasterizeText` directly.

## Consequences

- Five `rasterizeText + .map()` patterns in `examples/windows-svg/components.ts`
  collapse to single calls.
- The private `labelText_w` helper (a reimplementation of `measureText`) is removed.
- `measureText` remains the companion for layout math; `placeText` is for emission.
- `rasterizeText` stays exported for animation-driven use cases where cells need
  entity-local coordinates (e.g. `breakapart-svg`).
