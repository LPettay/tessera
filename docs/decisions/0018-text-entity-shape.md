# ADR 0018: `text` `EntityShape` kind with a built-in pixel font

## Status

Proposed — 2026-05-06

## Context

The v0.2.x demo set (mug, menu, inventory, landing, rhythm) shipped without typography. Every "label" in those scenes is hand-placed cell rows that *suggest* text — readers see something where text *should* be without anything actually meaning anything. The result reads as abstract art, not UI.

This is a framework gap, not a content gap. There's no way today to write `"FIGHT"` and have it render. The options are:

1. Hand-place cells per glyph, per scene — tedious, brittle, doesn't scale beyond a single demo.
2. Ship a way to author text declaratively — make `"FIGHT"` a one-liner.

A real game-UI framework needs (2). Typography is half of how UIs communicate intent; without it, every Tessera scene is forever decorative.

The natural place for this in the existing model is a new `EntityShape` kind: `text`. It sits as a peer to `voxel-sprite` (static rectangles) and `vector` (segments rasterized per frame, ADR 0014). Like both peers, it produces cells that the renderer paints; like both peers, it composes with every existing `Animation` kind without renderer changes.

## Decision

### API shape

Extend the `EntityShape` tagged union with a `text` variant:

```ts
export type EntityShape =
  | VoxelSpriteShape
  | VectorShape
  | TextShape;

export type TextShape = {
  kind: "text";
  /** ASCII printable text (0x20..0x7E). `\n` introduces a new line. */
  text: string;
  /** Solid fill color, hex string. */
  fill: string;
  /** Cells of horizontal gap between glyphs. Default 1. */
  letterSpacing?: number;
  /** Cells of vertical gap between text lines. Default 1. */
  lineSpacing?: number;
  /**
   * Anchor point in entity-local cell coordinates. Defaults to (0, 0) —
   * the top-left of the first glyph. Set to the centroid of the rendered
   * text for centered titles, or to the baseline for typographic
   * alignment.
   */
  pivot?: { x: number; y: number };
};
```

The renderer rasterizes the text once at build time — same model as `voxel-sprite`, where cells are static. Updating `Entity.shape.text` requires `controller.setScene(...)` to re-rasterize, mirroring how cell changes already work; per-frame text streaming is out of scope for v0.2.x.

### Built-in font

v0.2.x ships **one** built-in font: a fixed-width 5×7 bitmap covering ASCII printable (0x20–0x7E, 95 glyphs). Specifically:

- Glyph cell footprint: 5 cells wide × 7 cells tall (plus inter-glyph spacing).
- Glyph data: `number[]` of length 7 per glyph, each entry a 5-bit row mask. Total payload ≈ 95 glyphs × 7 numbers ≈ 665 array entries. Gzipped weight is well under 1 KB.
- Missing-glyph fallback: a 5×7 hatched box (renders as a visible placeholder so authors notice).
- The font module is internal to `src/core/`. It is not exposed on the public API surface in v0.2.x — userland cannot swap fonts yet.

A `TextFont` public type, custom font loading, proportional fonts, and an icon/symbol font are explicitly **deferred**; this ADR covers only the built-in default.

### Rasterization

The renderer (or a shared helper) computes cells from `(text, font, fill, letterSpacing, lineSpacing)`:

1. Walk `text` character-by-character; on `\n`, advance to a new line at x=0.
2. For each printable character: look up the glyph bitmap, emit a `Cell` for every set bit at the current `(cellX + col, cellY + row)`.
3. Advance `cellX` by `font.width + letterSpacing` per character; advance `cellY` by `font.height + lineSpacing` per line.
4. Apply the `pivot` offset by subtracting it from each emitted cell's coordinates (so `pivot` denotes "the entity-local point that lands at `Entity.position`").

The output is a list of single-cell `Cell` entries the renderer can paint via the same path used for `voxel-sprite`. SVG (Tier 1) builds one `<rect>` per cell inside the entity's `<g>`, exactly as today; Canvas2D / WebGL2 will reuse the same emitted cells when those tiers ship. No renderer-contract change.

### Animation

Text entities are first-class participants in every existing `Animation` kind. `pulse`, `bob`, `fade`, `drift`, `oscillate`, `spin` apply to the entity's group transform (or opacity for `fade`) without caring that the cells came from a string instead of a sprite. A pulsing **PRESS START** is just `{ kind: "text", text: "PRESS START", ... }` with `animation: { kind: "pulse", ... }`. Spin works too, with the caveat from ADR 0014 — for in-plane rotation of glyphs, use the rasterization model the `vector` kind uses; for v0.2.x, text entities reuse the voxel-sprite spin path (cells become tilted parallelograms at non-cardinal angles). A `text` analogue of ADR 0014's per-frame rasterization is a future kind, not this ADR.

### Public API surface

Adds one re-export from `src/index.ts`:

- `TextShape` (type)

`EntityShape` doesn't grow a new top-level export — it's the same union name, only its variant set widens. `extractExportNames` catches the `TextShape` addition and the `docs/api-surface.txt` snapshot updates accordingly.

## Consequences

- **Pro:** Real labels, real numbers, real menu copy. Every demo gets dramatically more intent for free; the abstract-art feel disappears in one PR.
- **Pro:** Animation kinds gain new expressive surface — title typography that pulses, score readouts that bob, dialogue cursors that fade — without any new animation work.
- **Pro:** Same conceptual model as `voxel-sprite` and `vector`. Existing `applyAnimation` paths and the SVG-renderer build pipeline absorb it with one new branch.
- **Pro:** Static-cell rasterization keeps the SVG-tier cell budget honest; a 20-character label is ~70 cells, well under any per-layer ceiling.
- **Con:** Adds ~1 KB of font data to every bundle that touches `Tessera`. Acceptable for a UI framework, but worth surfacing.
- **Con:** Fixed font choice for v0.2.x. Any author who wants a different look has to wait for the custom-font follow-up or hand-author a voxel-sprite. Documented as a known gap.
- **Con:** Spinning text at non-cardinal angles tilts the per-glyph cells (voxel-sprite spin behavior). For most UI use cases — pulsing titles, fading prompts, drifting subtitles — this never matters; for the rare "spinning text" use case, defer to the future vector-text follow-up.
- **Con:** Multi-line text via `\n` is the smallest possible primitive. Word wrap, alignment (right / center within a width box), and rich text are all out of scope. Authors compose multiple `text` entities for now.

## Alternatives considered

- **Generator approach (`textGenerator(config) → Cell[]`).** Symmetric with `BackgroundGenerator` (ADR 0013), keeps `EntityShape` smaller. Rejected because text is fundamentally an entity-level concern (it animates, it has a position, it composes with other shapes), not a layer-fill concern. Forcing authors to wrap a generator's output in a hand-built voxel-sprite Entity is friction that pays off only if multiple "shape kinds" share a generator pipeline — which they don't.
- **Userland-only: ship a glyph palette as docs.** Authors hand-author voxel-sprites for any text they want. Loses the productivity win entirely. Rejected.
- **Pull a font format at runtime (BDF, TTF-via-canvas, etc.).** Overkill for a 5×7 bitmap need; ties Tessera to runtime font parsing or canvas APIs that don't exist on every renderer tier. Rejected.
- **Ship multiple fonts in v0.2.x.** Tempting, but each new font is ~700 bytes plus design work, and we don't yet know what the second-favorite glyph size is. Ship one, learn from real demo authoring, add more deliberately. Deferred.
- **Ship a symbol/icon font (♥ ★ ⚔) alongside ASCII.** Useful for game UIs (heart pips, magic icons), but it's a separate design decision (which symbols? what semantics? CC0 or hand-authored?). Splitting it into its own future ADR keeps this one focused.
- **Per-frame rasterized vector text (analogue of ADR 0014).** Pixel-locked rotation for spinning headers. Real value, but only at angles that aren't cardinal — and the immediate value of typography is in static, pulsing, fading, bobbing labels, not spinning ones. Defer to a follow-up ADR.
