# ADR 0019: `TextShape.scale` — sub-cell glyph rendering

## Status

Accepted — 2026-05-07

## Context

ADR 0018 shipped `TextShape` with one glyph pixel = one layer cell. The five demos that immediately consumed it surfaced the same bug across the board: text is ~5–8× larger than typography needs to be. Each glyph is rasterized at the layer's full `cellSize` (10–12 px), so a single character is 50–84 px on screen and a word eats 30–60% of viewport width. Concretely, the rendered demos were:

- "TESSERA" / "VOXEL UI" titles spanning ~75% of viewport width.
- Inventory action labels ("ATK / MAG / USE / RUN") overflowing their 4-cell-tall rows so the labels stack like a column down the right side.
- "BUILD / PLAY / SHIP" card titles cut off because the 29-cell text doesn't fit a 26-cell-internal card.
- "PRESS BEAT" running off the lanes.

Authors *can* work around this by enlarging the layer (more cells at smaller `cellSize`), but that re-balances every other element in the scene and doesn't compose with mixed-scale art (chunky pixel-art portrait + small UI labels). The framework's job is to let text size independently of the macro art.

## Decision

Extend `TextShape` with an optional `scale` field:

```ts
export type TextShape = {
  kind: "text";
  text: string;
  fill: string;
  /**
   * Glyph "pixel" size in layer cells. Default 1 — each glyph pixel
   * occupies one layer cell (the v0.2.x ADR-0018 behavior). Use values
   * < 1 (typically 0.3–0.6) to render typography-scale text whose
   * glyphs are smaller than the surrounding macro art.
   */
  scale?: number;
  letterSpacing?: number;
  lineSpacing?: number;
  pivot?: { x: number; y: number };
};
```

The rasterizer emits cells at fractional positions and sizes when `scale ≠ 1`:

- Each "on" glyph bit becomes a `Cell` at `(cellX + col * scale, cellY + row * scale)` with `w = h = scale`.
- Inter-glyph advance is `(FONT_WIDTH + letterSpacing) * scale`; line advance is `(FONT_HEIGHT + lineSpacing) * scale`.
- `letterSpacing` and `lineSpacing` stay in glyph-cell units (multiplied by `scale` at use), so `letterSpacing: 1` always means "one glyph-cell of gap between letters" regardless of scale.
- `pivot` stays in entity-local cell coordinates (post-scale). For centering, `measureText()` already returns rendered dimensions and remains the correct helper.

The SVG renderer needs no change — `Cell.x/y` is already typed `number` (fractional allowed) and the existing `buildVoxelCell` writes `String(x * cellSize)` etc., which handles non-integers correctly. SVG accepts fractional coordinates and dimensions natively.

`scale = 1` preserves ADR-0018 behavior bit-for-bit; no migration is required for existing code (none yet, but stating the invariant explicitly).

## Consequences

- **Pro:** Real typography. A title at `scale: 0.6` and a body label at `scale: 0.4` both look like text instead of hero-scale pixel art.
- **Pro:** Authors stop fighting the cell grid for text; layouts authored for chunky voxel-sprites no longer have to shrink to accommodate massive labels.
- **Pro:** Animation still composes — a `scale: 0.5` text entity with a `pulse` animation pulses around its own center (the entity's transform-origin is unaffected by render-scale).
- **Pro:** Backward-compatible: omit `scale` and ADR 0018 behavior is preserved.
- **Con:** Glyph cells at `scale < 1` are sub-pixel-grid relative to the macro art. The `shape-rendering="crispEdges"` SVG hint we set may render fractional rects with rounding; in practice this stays sharp because we sample on the canvas pixel grid, not the layer cell grid, but it's worth noting.
- **Con:** Vector / Canvas2D renderer tiers (when they ship) will need to plumb the same fractional-cell support. SVG already does; lower tiers will follow naturally.
- **Con:** Authors now have a second knob (font scale) on top of `cellSize`. Documented; but the relationship is "scale stays in scene-cell space, just smaller" — not a new mental model.

## Alternatives considered

- **Ship a 3×5 small font alongside the 5×7.** Smaller in cell units, but still locked to the cell grid; can't render at *truly* small sizes without going sub-cell. Adds a second bitmap font's worth of data without solving the underlying scale problem. Rejected.
- **Bake font scale into the renderer.** Renderer always renders text at, say, half the cellSize. Too magical; locks all text to the same scale; defeats the purpose of having a configurable primitive.
- **Make `scale` mandatory with no default.** Forces every author to think about it. Friendlier to keep ADR-0018 behavior as the default and let authors opt in to typography scale.
- **Defer to a future "vector text" kind that rasterizes to canvas pixels directly.** Would solve the scale problem and the ADR-0018 spinning-text caveat together, but it's a much bigger surface change. `scale` is the immediate, additive fix; vector text is still on the table for later.
