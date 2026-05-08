/**
 * windows-svg scene — Win98-style desktop composed entirely from
 * components in `./components.ts`. No animations: a future agent will
 * add a cursor field that pushes individual cells around.
 *
 * Layout (200 × 120 cells × 4 px = 800 × 480 viewBox):
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  [Folder]   [Computer]   [Bin]                         │
 *   │                                                        │
 *   │            ┌─── NOTEPAD ─────────────[X]┐              │
 *   │            │                            │              │
 *   │            │ HELLO, TESSERA!            │              │
 *   │            │                            │              │
 *   │            │      ┌─── CALCULATOR ─[X]┐ │              │
 *   │            │      │ 1+1 = 2           │ │              │
 *   │            └──────┤                   ├─┘              │
 *   │                   └───────────────────┘                │
 *   │                                                        │
 *   │ [START]                              [10:24 AM]        │
 *   └────────────────────────────────────────────────────────┘
 *
 * Composition order matters only for layer-config first-wins (the
 * background fragment establishes the "ui" layer's geometry). Within a
 * shared layer, entities concatenate in insertion order — the first
 * fragments stamp first and end up "behind" later ones in iteration
 * order. The SVG renderer paints by entity order within a layer, so
 * later-listed components draw on top. We list windows after the
 * desktop icons so the windows can overlap them without backgrounds
 * showing through.
 */

import type { Scene } from "../../src/index.ts";
import { composeScene } from "../../src/index.ts";
import type { LayerDims } from "./theme.ts";
import { LAYER_DIMS, TASKBAR_HEIGHT } from "./theme.ts";
import {
  desktopBackground,
  desktopIcon,
  taskbar,
  windowChrome,
} from "./components.ts";

/**
 * Build the Win98 scene at the specified cell-grid dimensions.
 * Pass `dims` derived from the container viewport to avoid letterboxing
 * or clipping. Omit to get the 200×120 default (800×480 viewBox).
 */
export function buildWindowsScene(dims: LayerDims = LAYER_DIMS): Scene {
  return composeScene(
    // 1) Background — first so it owns layer config and sits on the bottom.
    desktopBackground({
      width: dims.width,
      height: dims.height,
      cellSize: dims.cellSize,
    }),

    // 2) Desktop icons along the top-left, spaced ~16 cells apart.
    desktopIcon({
      idPrefix: "icon-computer",
      x: 6,
      y: 6,
      label: "MY PC",
      kind: "computer",
      dims,
    }),
    desktopIcon({
      idPrefix: "icon-bin",
      x: 6,
      y: 22,
      label: "RECYCLE",
      kind: "bin",
      dims,
    }),
    desktopIcon({
      idPrefix: "icon-notepad",
      x: 6,
      y: 38,
      label: "NOTEPAD",
      kind: "folder",
      dims,
    }),

    // 3) Two overlapping windows. Notepad sits behind, Calculator on top
    //    and offset down-right.
    windowChrome({
      idPrefix: "win-notepad",
      x: 32,
      y: 18,
      w: 90,
      h: 60,
      title: "NOTEPAD - UNTITLED.TXT",
      bodyText: "HELLO, TESSERA!\n\nA WIN98-STYLE DESKTOP\nBUILT FROM VOXEL CELLS.",
      dims,
    }),
    windowChrome({
      idPrefix: "win-calc",
      x: 88,
      y: 48,
      w: 60,
      h: 50,
      title: "CALCULATOR",
      bodyText: "  1 + 1 = 2\n\n  READY.",
      dims,
    }),

    // 4) Taskbar last so it sits over everything (windows can extend
    //    underneath as if minimized to the bar).
    taskbar({
      idPrefix: "tb",
      clockText: "10:24 AM",
      width: dims.width,
      y: dims.height - TASKBAR_HEIGHT,
      dims,
    }),
  );
}

/** Static default scene — used by the gallery hub (fixed 800×480 viewBox). */
export const windowsScene: Scene = buildWindowsScene();
