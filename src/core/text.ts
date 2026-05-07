/**
 * Text rendering — built-in 5×7 fixed-width ASCII bitmap font + rasterizer.
 *
 * The font and rasterizer live in core because text rasterization is
 * tier-agnostic: every renderer (SVG today, Canvas2D / WebGL2 later)
 * consumes the same `VoxelSpriteCell[]` output. See ADR 0018.
 *
 * The font itself is internal — userland cannot swap it in v0.2.x.
 * Custom fonts are a future ADR.
 */

import type { TextShape, VoxelSpriteCell } from "./scene.ts";

/** Glyph footprint. */
export const FONT_WIDTH = 5;
export const FONT_HEIGHT = 7;

/**
 * Glyph data — one entry per char code, each entry is FONT_HEIGHT row
 * masks. Within a row, the most significant bit (1 << (FONT_WIDTH - 1))
 * is the left-most pixel. Lowercase a-z fold to uppercase A-Z (the font
 * has no lowercase forms — typical for compact UI fonts).
 *
 * Char codes not present in this map render as the missing-glyph
 * placeholder (a hatched 5×7 box) so authors notice immediately when a
 * char isn't supported.
 */
const GLYPHS: Record<number, readonly number[]> = {
  // 0x20 SPACE
  0x20: [0, 0, 0, 0, 0, 0, 0],
  // 0x21 !
  0x21: [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  // 0x22 "
  0x22: [0b01010, 0b01010, 0, 0, 0, 0, 0],
  // 0x23 #
  0x23: [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  // 0x25 %
  0x25: [0b11001, 0b11010, 0b00100, 0b01011, 0b10011, 0, 0],
  // 0x26 &
  0x26: [0b01100, 0b10010, 0b01100, 0b01000, 0b10101, 0b10010, 0b01101],
  // 0x27 '
  0x27: [0b00100, 0b00100, 0, 0, 0, 0, 0],
  // 0x28 (
  0x28: [0b00010, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00010],
  // 0x29 )
  0x29: [0b01000, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01000],
  // 0x2A *
  0x2a: [0, 0b01010, 0b00100, 0b11111, 0b00100, 0b01010, 0],
  // 0x2B +
  0x2b: [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  // 0x2C ,
  0x2c: [0, 0, 0, 0, 0, 0b00100, 0b01000],
  // 0x2D -
  0x2d: [0, 0, 0, 0b11111, 0, 0, 0],
  // 0x2E .
  0x2e: [0, 0, 0, 0, 0, 0b00100, 0b00100],
  // 0x2F /
  0x2f: [0b00001, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b10000],

  // 0x30..0x39 0-9
  0x30: [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  0x31: [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  0x32: [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  0x33: [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  0x34: [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  0x35: [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  0x36: [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  0x37: [0b11111, 0b00001, 0b00010, 0b00100, 0b00100, 0b00100, 0b00100],
  0x38: [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  0x39: [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],

  // 0x3A :
  0x3a: [0, 0b00100, 0b00100, 0, 0b00100, 0b00100, 0],
  // 0x3B ;
  0x3b: [0, 0b00100, 0b00100, 0, 0b00100, 0b00100, 0b01000],
  // 0x3C <
  0x3c: [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  // 0x3D =
  0x3d: [0, 0, 0b11111, 0, 0b11111, 0, 0],
  // 0x3E >
  0x3e: [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  // 0x3F ?
  0x3f: [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0, 0b00100],
  // 0x40 @
  0x40: [0b01110, 0b10001, 0b10111, 0b10101, 0b10111, 0b10000, 0b01110],

  // 0x41..0x5A A-Z
  0x41: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  0x42: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  0x43: [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
  0x44: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  0x45: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  0x46: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  0x47: [0b01111, 0b10000, 0b10000, 0b10011, 0b10001, 0b10001, 0b01111],
  0x48: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  0x49: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  0x4a: [0b01111, 0b00001, 0b00001, 0b00001, 0b10001, 0b10001, 0b01110],
  0x4b: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  0x4c: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  0x4d: [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001],
  0x4e: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  0x4f: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  0x50: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  0x51: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  0x52: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  0x53: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  0x54: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  0x55: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  0x56: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  0x57: [0b10001, 0b10001, 0b10001, 0b10001, 0b10101, 0b11011, 0b10001],
  0x58: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  0x59: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  0x5a: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],

  // 0x5B [
  0x5b: [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  // 0x5D ]
  0x5d: [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  // 0x5F _
  0x5f: [0, 0, 0, 0, 0, 0, 0b11111],
};

/** Hatched-box placeholder for missing glyphs. */
const MISSING_GLYPH: readonly number[] = [
  0b11111,
  0b10101,
  0b11111,
  0b10101,
  0b11111,
  0b10101,
  0b11111,
];

/** Look up a glyph by char code, folding lowercase to uppercase. */
function glyphFor(charCode: number): readonly number[] {
  // Fold lowercase a-z to uppercase A-Z; the font ships uppercase only.
  const code = charCode >= 0x61 && charCode <= 0x7a ? charCode - 0x20 : charCode;
  return GLYPHS[code] ?? MISSING_GLYPH;
}

/**
 * Rasterize a `TextShape` to `VoxelSpriteCell` entries the renderer
 * can paint. Output coordinates are in entity-local cell units, scaled
 * by `shape.scale` (default 1). `pivot` shifts the result so the pivot
 * lands at the entity's `position`.
 *
 * `\n` advances to a new line. Letter spacing defaults to 1; line
 * spacing defaults to 1. Both stay in glyph-cell units (multiplied by
 * `scale`) so a `letterSpacing: 1` always means "one glyph-cell of gap"
 * regardless of render scale. See ADR 0018 (the primitive) and ADR 0019
 * (the `scale` extension).
 */
export function rasterizeText(shape: TextShape): VoxelSpriteCell[] {
  const scale = shape.scale ?? 1;
  const letterSpacing = shape.letterSpacing ?? 1;
  const lineSpacing = shape.lineSpacing ?? 1;
  const pivotX = shape.pivot?.x ?? 0;
  const pivotY = shape.pivot?.y ?? 0;

  const out: VoxelSpriteCell[] = [];
  let cellX = 0;
  let cellY = 0;

  for (let i = 0; i < shape.text.length; i++) {
    const ch = shape.text.charCodeAt(i);
    if (ch === 0x0a) {
      cellX = 0;
      cellY += (FONT_HEIGHT + lineSpacing) * scale;
      continue;
    }
    const glyph = glyphFor(ch);
    for (let row = 0; row < FONT_HEIGHT; row++) {
      const bits = glyph[row]!;
      if (bits === 0) continue;
      for (let col = 0; col < FONT_WIDTH; col++) {
        const mask = 1 << (FONT_WIDTH - 1 - col);
        if (bits & mask) {
          out.push({
            x: cellX + col * scale - pivotX,
            y: cellY + row * scale - pivotY,
            w: scale,
            h: scale,
            fill: shape.fill,
          });
        }
      }
    }
    cellX += (FONT_WIDTH + letterSpacing) * scale;
  }

  return out;
}

/**
 * Pixel-cell footprint of a rendered text shape (post-scale) — useful
 * for centering a text entity inside a parent without rasterizing twice.
 * Returns the unrotated bounding box in entity-local cell units.
 */
export function measureText(
  shape: Pick<TextShape, "text" | "scale" | "letterSpacing" | "lineSpacing">,
): {
  width: number;
  height: number;
} {
  const scale = shape.scale ?? 1;
  const letterSpacing = shape.letterSpacing ?? 1;
  const lineSpacing = shape.lineSpacing ?? 1;

  const lines = shape.text.split("\n");
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const width =
    longest === 0 ? 0 : (longest * FONT_WIDTH + (longest - 1) * letterSpacing) * scale;
  const height =
    lines.length === 0
      ? 0
      : (lines.length * FONT_HEIGHT + (lines.length - 1) * lineSpacing) * scale;
  return { width, height };
}
