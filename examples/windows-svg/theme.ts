/**
 * Theme tokens for the windows-svg demo.
 *
 * A modest Win98 palette — only the colors the components actually need.
 * Each constant is named for the role it plays in chrome (face / highlight /
 * shadow / dark) so component code reads as intent (`CHROME_HIGHLIGHT`)
 * rather than raw hex (`#ffffff`).
 *
 * The classic raised-bevel illusion is built from four colors:
 *   highlight (top + left)  → CHROME_HIGHLIGHT
 *   face (interior)         → CHROME_FACE
 *   shadow (bottom + right) → CHROME_SHADOW
 *   darkest outer pixel     → CHROME_DARK
 *
 * Title bars use a horizontal-axis blue gradient (DARK_BLUE → LIGHT_BLUE)
 * with white text — the most recognizable Win98 cue.
 */

// --- Desktop ------------------------------------------------------------ //

/** Classic Win98 desktop teal. Fills the entire background layer. */
export const DESKTOP_TEAL = "#008080";

// --- Window chrome ------------------------------------------------------ //

/** Gray window face — body fill, taskbar fill, button face. */
export const CHROME_FACE = "#c0c0c0";
/** Top/left bevel highlight — sells the "raised" 3D illusion. */
export const CHROME_HIGHLIGHT = "#ffffff";
/** Bottom/right bevel shadow. */
export const CHROME_SHADOW = "#808080";
/** Outermost dark pixel — the bevel's hard edge. */
export const CHROME_DARK = "#000000";

// --- Title bar ---------------------------------------------------------- //

/** Title bar gradient start (left, focused window). */
export const TITLE_BLUE_DARK = "#000080";
/** Title bar gradient end (right, focused window). Lighter blue catches the eye. */
export const TITLE_BLUE_LIGHT = "#1084d0";
/** White title text on the blue gradient. */
export const TITLE_TEXT = "#ffffff";

// --- Icons -------------------------------------------------------------- //

/** Manila folder yellow — desktop folder fronts, START button accent. */
export const FOLDER_YELLOW = "#fff080";
/** Folder/icon outline. */
export const ICON_OUTLINE = "#000000";
/** Computer-icon beige (bezel of CRT-style icon). */
export const COMPUTER_BEIGE = "#dcd8b8";
/** CRT screen blue. */
export const SCREEN_BLUE = "#3c80c0";
/** Recycle-bin gray-blue. */
export const BIN_GRAY = "#9090a0";

// --- Text on chrome / desktop ------------------------------------------ //

/** Black text on light chrome (button labels, body text inside windows). */
export const TEXT_DARK = "#000000";
/** White text on the teal desktop background (icon labels). */
export const TEXT_LIGHT = "#ffffff";

// --- Dimensions --------------------------------------------------------- //

/**
 * Shape of the layer geometry object passed through the component tree.
 * Callers can supply any dimensions; `LAYER_DIMS` is the 800×480 default.
 */
export type LayerDims = {
  id: string;
  cellSize: number;
  width: number;
  height: number;
};

/**
 * The single layer's geometry. 200×120 cells × 4 px = 800×480 viewBox —
 * dense enough that a window title bar is ~5 cells tall and the cells
 * themselves are visibly square in the browser.
 */
export const LAYER_DIMS: LayerDims = {
  id: "ui",
  cellSize: 4,
  width: 200,
  height: 120,
};

/** Taskbar height in cells. ~10 cells reads as a chunky Win98 bar at our density. */
export const TASKBAR_HEIGHT = 10;

/**
 * Title-bar height in cells.
 *
 * The raisedBevel eats 1 row top (outer dark) + 1 row inner (highlight) and
 * the same at the bottom, leaving `titleH - 2` rows for the gradient region.
 * At scale 0.6, rasterizeText produces glyphs 4.2 cells tall, so
 * titleH - 2 ≥ 5 is required (≥ ceil(4.2) + 1 for breathing room).
 * 7 satisfies this: gradient region = 5 cells, text = 4.2. ← enforce in test.
 */
export const TITLEBAR_HEIGHT = 7;

// --- Layout constants referenced by component tests --------------------- //

/** START button total width in cells (face = START_BUTTON_W - 2). */
export const START_BUTTON_W = 24;
/** System-tray total width in cells (face = TRAY_W - 2). */
export const TRAY_W = 34;
/** Scale used for WIN98 title-bar text. */
export const TITLE_SCALE = 0.6;
/** Scale used for taskbar labels (START, clock). */
export const TASKBAR_TEXT_SCALE = 0.5;
