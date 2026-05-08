/**
 * Components for the windows-svg demo.
 *
 * Each exported function is a Tessera "component" per ADR 0023 — a pure
 * function that returns a `SceneFragment` (= `Layer[]`). The scene file
 * calls `composeScene(...)` to merge fragments into a single Scene.
 *
 * All components contribute to the single layer named `"ui"`. Same-id
 * fragments merge by concatenation; first wins on layer config (so the
 * desktop-background fragment is responsible for declaring cellSize /
 * width / height — see `desktopBackground` below).
 *
 * Cell choice:
 *   - The desktop background is one big `rect()` — no need for per-cell
 *     reactivity, and it would otherwise dominate the entity count.
 *   - Everything else (taskbar, windowChrome, desktopIcon body) uses
 *     `grid()` so each cell is an addressable entity. This is what lets
 *     the cursor field (a future agent's job) push individual cells
 *     around without re-authoring the components.
 *   - Text labels go through `rasterizeText()` — each lit glyph pixel
 *     becomes one cell entity automatically.
 *
 * Entity-id convention: `${idPrefix}.${role}.${index}`. `idPrefix` is
 * always supplied by the caller so multiple instances of the same
 * component can coexist without colliding (`win-1.title.0` vs
 * `win-2.title.0`).
 */

import type { Entity, Layer, SceneFragment, VoxelSpriteCell } from "../../src/index.ts";
import { gradient, grid, outline, rasterizeText, rect } from "../../src/index.ts";
import {
  BIN_GRAY,
  CHROME_DARK,
  CHROME_FACE,
  CHROME_HIGHLIGHT,
  CHROME_SHADOW,
  COMPUTER_BEIGE,
  DESKTOP_TEAL,
  FOLDER_YELLOW,
  ICON_OUTLINE,
  LAYER_DIMS,
  SCREEN_BLUE,
  TASKBAR_HEIGHT,
  TEXT_DARK,
  TEXT_LIGHT,
  TITLEBAR_HEIGHT,
  TITLE_BLUE_DARK,
  TITLE_BLUE_LIGHT,
  TITLE_TEXT,
} from "./theme.ts";

// --- Helpers ------------------------------------------------------------ //

/**
 * Wrap a list of cells as standalone unit entities so each cell is
 * individually addressable by the cursor field. Each cell's center is
 * the entity's `position`; the entity carries a single 1×1 voxel-sprite.
 *
 * Stable id: `${idPrefix}.${role}.${index}`.
 */
function entitiesFromCells(
  idPrefix: string,
  role: string,
  cells: VoxelSpriteCell[],
): Entity[] {
  return cells.map((cell, i) => {
    const w = cell.w ?? 1;
    const h = cell.h ?? 1;
    return {
      id: `${idPrefix}.${role}.${i}`,
      position: { x: cell.x, y: cell.y },
      shape: {
        kind: "voxel-sprite",
        cells: [{ x: 0, y: 0, w, h, fill: cell.fill }],
        pivot: { x: w / 2, y: h / 2 },
      },
    };
  });
}

/**
 * Standard Win98 raised bevel, four-sided. Two-pixel bevel: outer dark
 * ring, inner highlight/shadow corners. Returns an array of cells the
 * caller can hand to `entitiesFromCells`.
 *
 * Layout (cw = cell of color w):
 *   row 0: highlight along the top
 *   row h-1: dark along the bottom, shadow above it
 *   col 0: highlight along the left
 *   col w-1: dark along the right, shadow before it
 *
 * For chrome that doesn't need to be cursor-reactive (interior fill of
 * a panel), use `rect()` directly; this helper is for the bevel only.
 */
function raisedBevel(
  x: number,
  y: number,
  w: number,
  h: number,
): VoxelSpriteCell[] {
  const out: VoxelSpriteCell[] = [];
  // Outer dark single-cell border (drawn first).
  out.push(...outline(x, y, w, h, CHROME_DARK, 1));
  // Top + left highlight, inset by 1.
  for (let dx = 1; dx < w - 1; dx++) {
    out.push({ x: x + dx, y: y + 1, fill: CHROME_HIGHLIGHT });
  }
  for (let dy = 1; dy < h - 1; dy++) {
    out.push({ x: x + 1, y: y + dy, fill: CHROME_HIGHLIGHT });
  }
  // Bottom + right shadow, inset by 1.
  for (let dx = 1; dx < w - 1; dx++) {
    out.push({ x: x + dx, y: y + h - 2, fill: CHROME_SHADOW });
  }
  for (let dy = 1; dy < h - 1; dy++) {
    out.push({ x: x + w - 2, y: y + dy, fill: CHROME_SHADOW });
  }
  return out;
}

/** Empty fragment matching the canonical "ui" layer config. */
function emptyUiLayer(extras: Partial<Layer> = {}): Layer {
  return {
    id: LAYER_DIMS.id,
    cellSize: LAYER_DIMS.cellSize,
    width: LAYER_DIMS.width,
    height: LAYER_DIMS.height,
    entities: [],
    zIndex: 0,
    opacity: 1,
    visible: true,
    ...extras,
  };
}

// --- desktopBackground -------------------------------------------------- //

/**
 * Solid teal desktop fill. Emits a single `rect()` cell wrapped in one
 * entity — cheap, and per-cell reactivity isn't useful for a flat
 * background. (If the cursor field eventually wants to "lift" the desktop,
 * swap to `grid()` here; everything else stays the same.)
 *
 * This component owns the layer config — it's expected to be the first
 * fragment in `composeScene(...)` so its width/height/cellSize win.
 */
export function desktopBackground(opts: {
  width?: number;
  height?: number;
} = {}): SceneFragment {
  const w = opts.width ?? LAYER_DIMS.width;
  const h = opts.height ?? LAYER_DIMS.height;

  const bgEntity: Entity = {
    id: "desktop.bg",
    position: { x: 0, y: 0 },
    shape: {
      kind: "voxel-sprite",
      cells: rect(0, 0, w, h, DESKTOP_TEAL),
      pivot: { x: 0, y: 0 },
    },
  };

  return [emptyUiLayer({ entities: [bgEntity] })];
}

// --- taskbar ------------------------------------------------------------ //

/**
 * Bottom taskbar: gray panel + raised bevel + START button on the left,
 * digital clock on the right. Uses `grid()` for the panel face so every
 * cell is individually addressable by the cursor.
 *
 * Width is the layer width; height is the constant TASKBAR_HEIGHT.
 */
export function taskbar(opts: {
  idPrefix: string;
  width?: number;
  height?: number;
  y?: number;
  clockText?: string;
}): SceneFragment {
  const idPrefix = opts.idPrefix;
  const w = opts.width ?? LAYER_DIMS.width;
  const h = opts.height ?? TASKBAR_HEIGHT;
  const y = opts.y ?? LAYER_DIMS.height - h;
  const clockText = opts.clockText ?? "10:24 AM";

  // 1) Face (grid, addressable).
  const face = grid(0, y, w, h, CHROME_FACE);

  // 2) Bevel (top highlight + bottom dark line — bottom is page edge so
  //    skip the dark ring on bottom; emulate just the top raised edge).
  const bevel: VoxelSpriteCell[] = [];
  for (let dx = 0; dx < w; dx++) {
    bevel.push({ x: dx, y, fill: CHROME_HIGHLIGHT });
  }

  // 3) START button — small raised rectangle, ~16 cells wide.
  const startX = 2;
  const startY = y + 2;
  const startW = 18;
  const startH = h - 4;
  const startBevel = raisedBevel(startX, startY, startW, startH);
  const startFace = grid(startX + 1, startY + 1, startW - 2, startH - 2, CHROME_FACE);
  const startLabel = rasterizeText({
    kind: "text",
    text: "START",
    fill: TEXT_DARK,
    scale: 0.6,
  }).map((cell) => ({
    ...cell,
    x: cell.x + startX + 4,
    y: cell.y + startY + 1.5,
  }));
  // Tiny yellow flag block to fake the Win98 logo.
  const flag: VoxelSpriteCell[] = [
    { x: startX + 2, y: startY + 1, fill: FOLDER_YELLOW },
    { x: startX + 3, y: startY + 1, fill: FOLDER_YELLOW },
    { x: startX + 2, y: startY + 2, fill: FOLDER_YELLOW },
    { x: startX + 3, y: startY + 2, fill: FOLDER_YELLOW },
  ];

  // 4) System tray on the right — sunken bevel + clock text.
  const trayW = 32;
  const trayH = h - 4;
  const trayX = w - trayW - 2;
  const trayY = y + 2;
  const trayBevel: VoxelSpriteCell[] = [
    ...outline(trayX, trayY, trayW, trayH, CHROME_SHADOW, 1),
    // Sunken inner: highlight on bottom-right.
  ];
  const trayFace = grid(trayX + 1, trayY + 1, trayW - 2, trayH - 2, CHROME_FACE);
  const clockCells = rasterizeText({
    kind: "text",
    text: clockText,
    fill: TEXT_DARK,
    scale: 0.6,
  }).map((cell) => ({
    ...cell,
    x: cell.x + trayX + 3,
    y: cell.y + trayY + 1.5,
  }));

  const allCells: VoxelSpriteCell[] = [
    ...face,
    ...bevel,
    ...startBevel,
    ...startFace,
    ...flag,
    ...startLabel,
    ...trayBevel,
    ...trayFace,
    ...clockCells,
  ];

  return [emptyUiLayer({ entities: entitiesFromCells(idPrefix, "taskbar", allCells) })];
}

// --- windowChrome ------------------------------------------------------- //

/**
 * Win98 window: title bar (gradient blue) + body (gray) + raised outer
 * bevel + close-button area in the title bar. Body is `grid()`-backed so
 * every cell is individually addressable.
 *
 * Body content (text inside the window) is the caller's responsibility —
 * pass via `bodyText`. Multiple lines via `\n`.
 */
export function windowChrome(opts: {
  idPrefix: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  bodyText?: string;
}): SceneFragment {
  const { idPrefix, x, y, w, h, title } = opts;
  const titleH = TITLEBAR_HEIGHT;

  // 1) Outer raised bevel for the whole window frame.
  const frameBevel = raisedBevel(x, y, w, h);

  // 2) Body face (gray, addressable).
  const bodyFace = grid(x + 2, y + titleH, w - 4, h - titleH - 2, CHROME_FACE);

  // 3) Title bar — vertical-axis-irrelevant horizontal gradient, full width
  //    inside the bevel. We slot it into the rows just inside the outer
  //    dark ring (rows y+1..y+titleH-1 wide w-2 — but our raisedBevel
  //    already painted highlight cells along y+1; the gradient overwrites
  //    them, which is what we want for the title region).
  const titleX = x + 2;
  const titleY = y + 2;
  const titleW = w - 4;
  const titleBarH = titleH - 2;
  const titleBar = gradient(
    titleX,
    titleY,
    titleW,
    titleBarH,
    TITLE_BLUE_DARK,
    TITLE_BLUE_LIGHT,
    "horizontal",
  );

  // 4) Title text — left-aligned, vertically centered in the title bar.
  const titleCells = rasterizeText({
    kind: "text",
    text: title,
    fill: TITLE_TEXT,
    scale: 0.6,
  }).map((cell) => ({
    ...cell,
    x: cell.x + titleX + 1,
    y: cell.y + titleY + 0.5,
  }));

  // 5) Close-button area on the right of the title bar — small gray square
  //    with a black "X". ~3×3 cells.
  const btnW = 3;
  const btnH = 3;
  const btnX = titleX + titleW - btnW - 1;
  const btnY = titleY;
  const closeBtn: VoxelSpriteCell[] = [
    ...grid(btnX, btnY, btnW, btnH, CHROME_FACE),
    // Diagonal X strokes.
    { x: btnX, y: btnY, fill: TEXT_DARK },
    { x: btnX + 1, y: btnY + 1, fill: TEXT_DARK },
    { x: btnX + 2, y: btnY + 2, fill: TEXT_DARK },
    { x: btnX + 2, y: btnY, fill: TEXT_DARK },
    { x: btnX + 1, y: btnY + 1, fill: TEXT_DARK },
    { x: btnX, y: btnY + 2, fill: TEXT_DARK },
  ];

  // 6) Body text (optional). Renders inside the body region with a small
  //    inset.
  const bodyTextCells: VoxelSpriteCell[] = opts.bodyText
    ? rasterizeText({
        kind: "text",
        text: opts.bodyText,
        fill: TEXT_DARK,
        scale: 0.6,
      }).map((cell) => ({
        ...cell,
        x: cell.x + x + 4,
        y: cell.y + y + titleH + 2,
      }))
    : [];

  const allCells: VoxelSpriteCell[] = [
    ...frameBevel,
    ...bodyFace,
    ...titleBar,
    ...titleCells,
    ...closeBtn,
    ...bodyTextCells,
  ];

  return [emptyUiLayer({ entities: entitiesFromCells(idPrefix, "chrome", allCells) })];
}

// --- desktopIcon -------------------------------------------------------- //

type IconKind = "folder" | "computer" | "bin";

/**
 * Desktop icon — small ~6×6 cell mark plus a label below in white text.
 * Body cells are addressable so they react to the cursor; the label is
 * rasterized per-glyph-cell so it reacts too.
 *
 * `kind` picks one of three pixel sketches: a manila folder, a beige
 * computer with a blue CRT screen, or a gray-blue trash bin.
 */
export function desktopIcon(opts: {
  idPrefix: string;
  x: number;
  y: number;
  label: string;
  kind?: IconKind;
  /** Override the default fill for the icon body (folder front, etc.). */
  color?: string;
}): SceneFragment {
  const { idPrefix, x, y, label } = opts;
  const kind: IconKind = opts.kind ?? "folder";

  const iconCells = drawIcon(kind, x, y, opts.color);

  // Label — center horizontally under the icon.
  const labelScale = 0.5;
  const labelCells = rasterizeText({
    kind: "text",
    text: label,
    fill: TEXT_LIGHT,
    scale: labelScale,
  });
  // Width of the rasterized label in cells (post-scale).
  const labelW = labelText_w(label, labelScale);
  const labelX = x + 3 - labelW / 2;
  const labelY = y + 8;
  const placedLabel = labelCells.map((cell) => ({
    ...cell,
    x: cell.x + labelX,
    y: cell.y + labelY,
  }));

  const allCells: VoxelSpriteCell[] = [...iconCells, ...placedLabel];

  return [emptyUiLayer({ entities: entitiesFromCells(idPrefix, "icon", allCells) })];
}

/** Approximate post-scale width in cells of a one-line ASCII label. */
function labelText_w(text: string, scale: number): number {
  // Same formula as `measureText`, inlined to avoid the import for one number.
  const FONT_W = 5;
  const LETTER_SPACING = 1;
  const n = text.length;
  if (n === 0) return 0;
  return (n * FONT_W + (n - 1) * LETTER_SPACING) * scale;
}

/**
 * Pixel sketch for a single icon kind, anchored at (x, y) — top-left of
 * a 6×7-ish bounding box.
 */
function drawIcon(kind: IconKind, x: number, y: number, color?: string): VoxelSpriteCell[] {
  if (kind === "folder") {
    const fill = color ?? FOLDER_YELLOW;
    return [
      // Folder tab.
      ...grid(x, y, 3, 1, fill),
      // Folder body.
      ...grid(x, y + 1, 6, 5, fill),
      // Outline.
      ...outline(x, y + 1, 6, 5, ICON_OUTLINE, 1),
      { x: x, y: y, fill: ICON_OUTLINE },
      { x: x + 3, y: y, fill: ICON_OUTLINE },
      { x: x + 3, y: y + 1, fill: ICON_OUTLINE },
    ];
  }
  if (kind === "computer") {
    return [
      // Monitor body (beige).
      ...grid(x, y, 6, 4, COMPUTER_BEIGE),
      // Screen (blue).
      ...grid(x + 1, y + 1, 4, 2, SCREEN_BLUE),
      // Stand.
      ...grid(x + 2, y + 4, 2, 1, COMPUTER_BEIGE),
      // Base.
      ...grid(x + 1, y + 5, 4, 1, COMPUTER_BEIGE),
      // Outline along the top + sides.
      { x: x - 0, y: y, fill: ICON_OUTLINE },
      { x: x + 5, y: y, fill: ICON_OUTLINE },
      { x: x, y: y + 3, fill: ICON_OUTLINE },
      { x: x + 5, y: y + 3, fill: ICON_OUTLINE },
    ];
  }
  // bin
  return [
    // Lid.
    ...grid(x, y, 6, 1, BIN_GRAY),
    // Body.
    ...grid(x + 1, y + 1, 4, 5, BIN_GRAY),
    // Outline accents.
    { x: x + 1, y: y + 2, fill: ICON_OUTLINE },
    { x: x + 4, y: y + 2, fill: ICON_OUTLINE },
    { x: x + 1, y: y + 4, fill: ICON_OUTLINE },
    { x: x + 4, y: y + 4, fill: ICON_OUTLINE },
    { x: x + 2, y: y + 3, fill: ICON_OUTLINE },
    { x: x + 3, y: y + 3, fill: ICON_OUTLINE },
  ];
}
