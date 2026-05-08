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
import { gradient, grid, measureText, outline, placeText, rect } from "../../src/index.ts";
import type { LayerDims } from "./theme.ts";
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
  START_BUTTON_W,
  TASKBAR_HEIGHT,
  TASKBAR_TEXT_SCALE,
  TEXT_DARK,
  TEXT_LIGHT,
  TITLEBAR_HEIGHT,
  TITLE_BLUE_DARK,
  TITLE_BLUE_LIGHT,
  TITLE_SCALE,
  TITLE_TEXT,
  TRAY_W,
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

/** Empty fragment for the "ui" layer, using the supplied (or default) dims. */
function emptyUiLayer(dims: LayerDims, extras: Partial<Layer> = {}): Layer {
  return {
    id: dims.id,
    cellSize: dims.cellSize,
    width: dims.width,
    height: dims.height,
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
  cellSize?: number;
} = {}): SceneFragment {
  const dims: LayerDims = {
    id: LAYER_DIMS.id,
    cellSize: opts.cellSize ?? LAYER_DIMS.cellSize,
    width: opts.width ?? LAYER_DIMS.width,
    height: opts.height ?? LAYER_DIMS.height,
  };

  const bgEntity: Entity = {
    id: "desktop.bg",
    position: { x: 0, y: 0 },
    shape: {
      kind: "voxel-sprite",
      cells: rect(0, 0, dims.width, dims.height, DESKTOP_TEAL),
      pivot: { x: 0, y: 0 },
    },
  };

  return [emptyUiLayer(dims, { entities: [bgEntity] })];
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
  dims?: LayerDims;
}): SceneFragment {
  const idPrefix = opts.idPrefix;
  const dims = opts.dims ?? LAYER_DIMS;
  const w = opts.width ?? dims.width;
  const h = opts.height ?? TASKBAR_HEIGHT;
  const y = opts.y ?? dims.height - h;
  const clockText = opts.clockText ?? "10:24 AM";

  // 1) Face (grid, addressable).
  const face = grid(0, y, w, h, CHROME_FACE);

  // 2) Top raised edge — single highlight row across the full width.
  const bevel: VoxelSpriteCell[] = [];
  for (let dx = 0; dx < w; dx++) {
    bevel.push({ x: dx, y, fill: CHROME_HIGHLIGHT });
  }

  // 3) START button.
  const startX = 2;
  const startY = y + 2;
  const startW = START_BUTTON_W;
  const startH = h - 4;
  // Face first, bevel on top so highlight/shadow aren't overpainted.
  const startFace = grid(startX + 1, startY + 1, startW - 2, startH - 2, CHROME_FACE);
  const startBevel = raisedBevel(startX, startY, startW, startH);
  const startLabelM = measureText({ text: "START", scale: TASKBAR_TEXT_SCALE });
  // Vertically center within the full button height (text overpaints bevel edges).
  const startLabelY = startY + (startH - startLabelM.height) / 2;
  const startLabel = placeText("START", startX + 4, startLabelY, TASKBAR_TEXT_SCALE, TEXT_DARK);
  // Tiny yellow flag block to fake the Win98 logo.
  const flag: VoxelSpriteCell[] = [
    { x: startX + 2, y: startY + 1, fill: FOLDER_YELLOW },
    { x: startX + 3, y: startY + 1, fill: FOLDER_YELLOW },
    { x: startX + 2, y: startY + 2, fill: FOLDER_YELLOW },
    { x: startX + 3, y: startY + 2, fill: FOLDER_YELLOW },
  ];

  // 4) System tray on the right — sunken bevel + clock text.
  const trayH = h - 4;
  const trayX = w - TRAY_W - 2;
  const trayY = y + 2;
  // Face first, bevel (shadow outline) on top.
  const trayFace = grid(trayX + 1, trayY + 1, TRAY_W - 2, trayH - 2, CHROME_FACE);
  const trayBevel: VoxelSpriteCell[] = [
    ...outline(trayX, trayY, TRAY_W, trayH, CHROME_SHADOW, 1),
  ];
  const clockM = measureText({ text: clockText, scale: TASKBAR_TEXT_SCALE });
  const clockLabelY = trayY + 1 + Math.max(0, (trayH - 2 - clockM.height) / 2);
  const clockCells = placeText(clockText, trayX + 3, clockLabelY, TASKBAR_TEXT_SCALE, TEXT_DARK);

  const allCells: VoxelSpriteCell[] = [
    ...face,
    ...bevel,
    ...startFace,
    ...startBevel,
    ...flag,
    ...startLabel,
    ...trayFace,
    ...trayBevel,
    ...clockCells,
  ];

  return [emptyUiLayer(dims, { entities: entitiesFromCells(idPrefix, "taskbar", allCells) })];
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
  dims?: LayerDims;
}): SceneFragment {
  const { idPrefix, x, y, w, h, title } = opts;
  const dims = opts.dims ?? LAYER_DIMS;
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

  // 4) Title text — left-aligned, vertically centered in the gradient region.
  const titleTextM = measureText({ text: title, scale: TITLE_SCALE });
  const titleTextOffsetY = (titleBarH - titleTextM.height) / 2;
  const titleCells = placeText(title, titleX + 1, titleY + titleTextOffsetY, TITLE_SCALE, TITLE_TEXT);

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
    ? placeText(opts.bodyText, x + 4, y + titleH + 2, 0.6, TEXT_DARK)
    : [];

  const allCells: VoxelSpriteCell[] = [
    ...frameBevel,
    ...bodyFace,
    ...titleBar,
    ...titleCells,
    ...closeBtn,
    ...bodyTextCells,
  ];

  return [emptyUiLayer(dims, { entities: entitiesFromCells(idPrefix, "chrome", allCells) })];
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
  dims?: LayerDims;
}): SceneFragment {
  const { idPrefix, x, y, label } = opts;
  const dims = opts.dims ?? LAYER_DIMS;
  const kind: IconKind = opts.kind ?? "folder";

  const iconCells = drawIcon(kind, x, y, opts.color);

  // Label — center horizontally under the icon.
  const labelScale = 0.5;
  const labelW = measureText({ text: label, scale: labelScale }).width;
  const labelX = x + 3 - labelW / 2;
  const labelY = y + 8;
  const placedLabel = placeText(label, labelX, labelY, labelScale, TEXT_LIGHT);

  const allCells: VoxelSpriteCell[] = [...iconCells, ...placedLabel];

  return [emptyUiLayer(dims, { entities: entitiesFromCells(idPrefix, "icon", allCells) })];
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
