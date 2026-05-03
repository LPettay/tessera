import type { Entity, Layer, Scene, VoxelSpriteCell } from "../../src/index.ts";

/**
 * JRPG-style inventory / status screen.
 *
 * Layout (100×56 cells):
 *   - Left panel  (x 2..32):  character portrait + name plate
 *   - Right panel (x 34..98): stats + equipment grid + dialogue
 *   - Bottom-spanning dialogue box (y 44..54)
 *
 * Each entity uses one Animation (composition isn't shipped). Stacked
 * behaviors — e.g., a button that pulses *and* glows — are faked by
 * splitting into multiple entities at slightly different positions.
 */

const LAYER = { width: 100, height: 56, cellSize: 12 };

// --- Palette -------------------------------------------------------------- //
const PANEL = "#1a1f3d";
const PANEL_LIGHT = "#2c3563";
const PANEL_DARK = "#0d1129";
const PANEL_RIM = "#5c70b8";
const ACCENT = "#ffd166";
const ACCENT_HOT = "#fff2c2";
const HP_HI = "#3ed46a";
const HP_LOW = "#d4452e";
const MP_HI = "#2ea3d4";
const TEXT = "#dde6ff";
const SPARKLE = "#fff8d4";
const SLOT_BG = "#0d1129";
const SLOT_RIM = "#3a4280";
const ICON_RED = "#d4452e";
const ICON_GOLD = "#ffd166";
const ICON_TEAL = "#2ea3d4";
const ICON_PURPLE = "#a55ec8";

// --- Helpers -------------------------------------------------------------- //

/** Solid axis-aligned rectangle of cells. */
function rect(x: number, y: number, w: number, h: number, fill: string): VoxelSpriteCell {
  return { x, y, w, h, fill };
}

/** Outlined panel — interior fill with a 1-cell rim of `rimFill`. */
function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  bodyFill: string,
  rimFill: string,
): VoxelSpriteCell[] {
  return [
    rect(x, y, w, h, rimFill),
    rect(x + 1, y + 1, w - 2, h - 2, bodyFill),
  ];
}

// --- Static frame --------------------------------------------------------- //
// The screen frame uses voxel-sprite cells (with w/h rects) wrapped in a
// non-animated Entity. Layer.cells doesn't support multi-cell rects — only
// voxel-sprite shapes do — so chunky panel fills stay cheap by living in
// a sprite instead of expanding to thousands of single Cell entries.

const frameSpriteCells: VoxelSpriteCell[] = [
  // Outer panel covering the whole screen
  ...panel(0, 0, 100, 56, PANEL, PANEL_RIM),
  // Left portrait panel
  ...panel(2, 2, 30, 30, PANEL_DARK, PANEL_LIGHT),
  // Right stats panel
  ...panel(34, 2, 64, 16, PANEL_DARK, PANEL_LIGHT),
  // Equipment grid frame
  ...panel(34, 20, 32, 22, PANEL_DARK, PANEL_LIGHT),
  // Action menu frame
  ...panel(68, 20, 30, 22, PANEL_DARK, PANEL_LIGHT),
  // Dialogue box across the bottom
  ...panel(2, 44, 96, 10, PANEL_DARK, ACCENT),
];

const frame: Entity = {
  id: "frame",
  position: { x: 0, y: 0 },
  shape: { kind: "voxel-sprite", cells: frameSpriteCells, pivot: { x: 0, y: 0 } },
};

// --- Character portrait ---------------------------------------------- //
// Stylized helmeted figure — body, head, plume, shoulders. The portrait
// itself doesn't animate; the helmet plume above it oscillates.

const portraitCells: VoxelSpriteCell[] = [
  // Body (armor)
  rect(-6, -1, 12, 8, PANEL_LIGHT),
  rect(-5, 0, 10, 6, "#3a4280"),
  rect(-1, 1, 2, 4, ACCENT),
  // Shoulders
  rect(-7, -1, 1, 4, PANEL_LIGHT),
  rect(6, -1, 1, 4, PANEL_LIGHT),
  // Neck
  rect(-1, -3, 2, 2, "#c8a07a"),
  // Head/helmet
  rect(-3, -8, 6, 6, "#3a4280"),
  rect(-3, -7, 1, 4, PANEL_LIGHT),
  rect(2, -7, 1, 4, PANEL_DARK),
  // Visor band
  rect(-2, -6, 4, 1, "#0d1129"),
  // Eyes
  rect(-2, -5, 1, 1, ACCENT_HOT),
  rect(1, -5, 1, 1, ACCENT_HOT),
  // Cheek pieces
  rect(-3, -4, 1, 1, "#0d1129"),
  rect(2, -4, 1, 1, "#0d1129"),
];

const portrait: Entity = {
  id: "portrait",
  position: { x: 17, y: 18 },
  shape: { kind: "voxel-sprite", cells: portraitCells, pivot: { x: 0, y: 0 } },
};

// Plume on top of the helmet — sways via oscillate-Y for that ceremonial-
// idle feel. The plume uses voxel-sprite but its own pivot is at the base
// so the sway hinges from the helmet.
const plumeCells: VoxelSpriteCell[] = [
  rect(-1, -4, 2, 1, ACCENT),
  rect(-1, -3, 2, 1, ACCENT),
  rect(0, -2, 1, 1, ACCENT_HOT),
  rect(-1, -1, 2, 1, ACCENT_HOT),
  rect(0, 0, 1, 1, ACCENT),
];

const plume: Entity = {
  id: "plume",
  position: { x: 17, y: 10 },
  shape: { kind: "voxel-sprite", cells: plumeCells, pivot: { x: 0, y: 0 } },
  animation: {
    kind: "oscillate",
    axis: "y",
    degrees: 14,
    durationMs: 3200,
    repeat: "infinite",
  },
};

// --- Name plate (static) and HP/MP bars (animated) ---------------------- //

// Plate background (static under the bars)
const plateCells: VoxelSpriteCell[] = [
  rect(0, 0, 60, 14, PANEL_DARK),
  rect(0, 0, 60, 1, ACCENT),
  rect(0, 13, 60, 1, ACCENT),
  // "name" — pixel block reading as a name slot, not actual text
  rect(2, 2, 18, 2, TEXT),
  rect(2, 5, 8, 1, "#8094c8"),
  // HP label block
  rect(2, 7, 4, 2, HP_HI),
  rect(8, 7, 24, 2, PANEL_LIGHT), // HP bar bg
  rect(8, 7, 18, 2, HP_HI),       // HP bar fill (3/4)
  // MP label block
  rect(2, 10, 4, 2, MP_HI),
  rect(8, 10, 24, 2, PANEL_LIGHT), // MP bar bg
  rect(8, 10, 14, 2, MP_HI),       // MP bar fill (~half)
  // EXP indicator on the right
  rect(34, 2, 24, 1, "#3a4280"),
  rect(34, 2, 16, 1, ACCENT),
  rect(34, 4, 4, 2, ACCENT),
  rect(40, 4, 18, 2, "#3a4280"),
];

const namePlate: Entity = {
  id: "name-plate",
  position: { x: 36, y: 4 },
  shape: { kind: "voxel-sprite", cells: plateCells, pivot: { x: 0, y: 0 } },
};

// "HP critical" warning bar — a short red overlay on the HP bar that
// fades. Faked composition: separate entity layered on top of the
// static plate.
const hpWarning: Entity = {
  id: "hp-warning",
  position: { x: 44, y: 11 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(0, 0, 18, 2, HP_LOW)],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "fade", from: 0, to: 0.55, durationMs: 900, repeat: "infinite" },
};

// --- Equipment grid ------------------------------------------------------ //
// 4×2 grid of slots. Each slot is a static panel; each item icon inside
// is its own entity that bobs with a staggered duration.

const SLOT_W = 6;
const SLOT_H = 6;
const GRID_X = 36;
const GRID_Y = 22;
const GRID_GAP = 1;

const slotSpriteCells: VoxelSpriteCell[] = [];
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 4; col++) {
    const sx = GRID_X + col * (SLOT_W + GRID_GAP);
    const sy = GRID_Y + row * (SLOT_H + GRID_GAP);
    slotSpriteCells.push(rect(sx, sy, SLOT_W, SLOT_H, SLOT_RIM));
    slotSpriteCells.push(rect(sx + 1, sy + 1, SLOT_W - 2, SLOT_H - 2, SLOT_BG));
  }
}

const slots: Entity = {
  id: "equipment-slots",
  position: { x: 0, y: 0 },
  shape: { kind: "voxel-sprite", cells: slotSpriteCells, pivot: { x: 0, y: 0 } },
};

type ItemSeed = { col: number; row: number; color: string; durationMs: number };
const ITEMS: ItemSeed[] = [
  { col: 0, row: 0, color: ICON_RED, durationMs: 1300 },
  { col: 1, row: 0, color: ICON_GOLD, durationMs: 1500 },
  { col: 2, row: 0, color: ICON_TEAL, durationMs: 1700 },
  { col: 3, row: 0, color: ICON_PURPLE, durationMs: 1450 },
  { col: 0, row: 1, color: ICON_TEAL, durationMs: 1600 },
  { col: 2, row: 1, color: ICON_GOLD, durationMs: 1350 },
];

const items: Entity[] = ITEMS.map((it, i) => {
  const cx = GRID_X + it.col * (SLOT_W + GRID_GAP) + Math.floor(SLOT_W / 2);
  const cy = GRID_Y + it.row * (SLOT_H + GRID_GAP) + Math.floor(SLOT_H / 2);
  return {
    id: `item-${i}`,
    position: { x: cx, y: cy },
    shape: {
      kind: "voxel-sprite",
      cells: [
        rect(-1, -1, 2, 2, it.color),
        rect(0, 0, 1, 1, ACCENT_HOT),
      ],
      pivot: { x: 0, y: 0 },
    },
    animation: { kind: "bob", amplitude: 0.5, durationMs: it.durationMs, repeat: "infinite" },
  };
});

// --- Action menu --------------------------------------------------------- //
// Four vertical menu rows; the first row has a pulsing selection cursor
// to its left, indicating the active option.

const ACTION_X = 70;
const ACTION_Y = 22;

const actionRows: VoxelSpriteCell[] = [];
for (let i = 0; i < 4; i++) {
  const ay = ACTION_Y + 2 + i * 5;
  // Row body
  actionRows.push(rect(ACTION_X + 4, ay, 22, 3, i === 0 ? PANEL_LIGHT : "#1a1f3d"));
  // Row label glyph block
  actionRows.push(rect(ACTION_X + 6, ay + 1, 8, 1, TEXT));
}

const actionMenuStatic: Entity = {
  id: "action-menu-static",
  position: { x: 0, y: 0 },
  shape: { kind: "voxel-sprite", cells: actionRows, pivot: { x: 0, y: 0 } },
};

// Pulsing selection cursor (a triangle-ish arrow next to the active row).
const cursorCells: VoxelSpriteCell[] = [
  rect(0, 0, 1, 1, ACCENT),
  rect(1, 0, 1, 1, ACCENT_HOT),
  rect(2, 0, 1, 1, ACCENT),
];

const selectionCursor: Entity = {
  id: "selection-cursor",
  position: { x: ACTION_X + 1, y: ACTION_Y + 3 },
  shape: { kind: "voxel-sprite", cells: cursorCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "pulse", from: 0.85, to: 1.4, durationMs: 700, repeat: "infinite" },
};

// --- Dialogue box -------------------------------------------------------- //
// Pixel-text-block rows simulate a multi-line message; a fading triangle
// at the right indicates "press to continue".

const dialogueRows: VoxelSpriteCell[] = [
  rect(6, 47, 70, 1, TEXT),
  rect(6, 49, 56, 1, TEXT),
  rect(6, 51, 40, 1, TEXT),
];

const dialogueText: Entity = {
  id: "dialogue-text",
  position: { x: 0, y: 0 },
  shape: { kind: "voxel-sprite", cells: dialogueRows, pivot: { x: 0, y: 0 } },
};

const continueArrow: Entity = {
  id: "continue-arrow",
  position: { x: 92, y: 51 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(0, 0, 1, 1, ACCENT),
      rect(1, 0, 1, 1, ACCENT),
      rect(2, 0, 1, 1, ACCENT_HOT),
    ],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "fade", from: 0.2, to: 1.0, durationMs: 900, repeat: "infinite" },
};

// --- Background sparkles (drift) ---------------------------------------- //
// Sparse drifting dust, kept inside the screen frame for atmosphere.
const sparkleCells: VoxelSpriteCell[] = [{ x: 0, y: 0, fill: SPARKLE }];

type SparkleSeed = { x: number; y: number; vx: number; vy: number };
const SPARKLE_SEEDS: SparkleSeed[] = [
  { x: 8, y: 38, vx: 0.5, vy: -0.2 },
  { x: 88, y: 8, vx: -0.45, vy: 0.3 },
  { x: 50, y: 6, vx: 0.3, vy: 0.4 },
  { x: 28, y: 12, vx: -0.4, vy: 0.25 },
];

const sparkles: Entity[] = SPARKLE_SEEDS.map((s, i) => ({
  id: `bg-sparkle-${i}`,
  position: { x: s.x, y: s.y },
  shape: { kind: "voxel-sprite", cells: sparkleCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "drift", velocity: { x: s.vx, y: s.vy } },
}));

// --- Layers --------------------------------------------------------------- //

const frameLayer: Layer = {
  id: "frame",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [frame, ...sparkles],
  zIndex: 0,
  opacity: 1,
  visible: true,
};

const contentLayer: Layer = {
  id: "content",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [
    slots,
    portrait,
    plume,
    namePlate,
    hpWarning,
    actionMenuStatic,
    selectionCursor,
    ...items,
    dialogueText,
    continueArrow,
  ],
  zIndex: 1,
  opacity: 1,
  visible: true,
};

export const inventoryScene: Scene = {
  layers: [frameLayer, contentLayer],
};
