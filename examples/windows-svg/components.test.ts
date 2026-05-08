/**
 * Layout invariant tests for windows-svg components.
 *
 * Every text placement has a container. These tests verify that the
 * measured text dimensions fit inside the declared container at the
 * configured scale. A failing test means either:
 *   (a) the scale was increased beyond what the container can hold, or
 *   (b) the container was shrunk without adjusting the text placement.
 *
 * Constants mirror what the component functions use internally so any
 * drift between theme constants and component logic surfaces here.
 */

import { describe, expect, it } from "bun:test";
import { measureText } from "../../src/index.ts";
import {
  START_BUTTON_W,
  TASKBAR_HEIGHT,
  TASKBAR_TEXT_SCALE,
  TITLEBAR_HEIGHT,
  TITLE_SCALE,
  TRAY_W,
} from "./theme.ts";

// ---- helpers ------------------------------------------------------------- //

// ---- taskbar: START button ----------------------------------------------- //

describe("taskbar / START button", () => {
  // raisedBevel eats 2 cols on each side (outer dark + inner highlight/shadow).
  // Face spans startW-2 columns wide, startH-2 rows tall.
  // The flag + padding consume the leftmost 3 cols of the face before the label.
  const startH = TASKBAR_HEIGHT - 4; // = 6
  const faceW = START_BUTTON_W - 2;  // = 22
  const labelOffsetFromFaceLeft = 3; // flag (2 cols) + 1-col gap
  const availW = faceW - labelOffsetFromFaceLeft; // = 19
  // Label is vertically centered in the full button height (text overpaints
  // bevel edges), so the container height for the purpose of the fit check
  // is the full button height.
  const availH = startH; // = 6

  it("START label fits horizontally in button face", () => {
    const { width } = measureText({ text: "START", scale: TASKBAR_TEXT_SCALE });
    expect(width).toBeLessThanOrEqual(availW);
  });

  it("START label fits vertically in button height", () => {
    const { height } = measureText({ text: "START", scale: TASKBAR_TEXT_SCALE });
    expect(height).toBeLessThanOrEqual(availH);
  });
});

// ---- taskbar: system tray clock ----------------------------------------- //

describe("taskbar / system tray clock", () => {
  const trayH = TASKBAR_HEIGHT - 4; // = 6
  const trayFaceW = TRAY_W - 2;     // = 32
  const trayFaceH = trayH - 2;      // = 4 (inside bevel)
  // Clock is padded 2 cols from the face left; give 2 cols right margin.
  const clockPadLeft = 2;
  const clockPadRight = 2;
  const availW = trayFaceW - clockPadLeft - clockPadRight; // = 28
  const availH = trayFaceH; // = 4

  it("clock text fits horizontally in tray face", () => {
    const { width } = measureText({ text: "10:24 AM", scale: TASKBAR_TEXT_SCALE });
    expect(width).toBeLessThanOrEqual(availW);
  });

  it("clock text fits vertically in tray face", () => {
    const { height } = measureText({ text: "10:24 AM", scale: TASKBAR_TEXT_SCALE });
    expect(height).toBeLessThanOrEqual(availH);
  });
});

// ---- window title bar ---------------------------------------------------- //

describe("window title bar", () => {
  // raisedBevel eats 2 rows top and 2 bottom. The blue gradient region
  // (titleBarH = TITLEBAR_HEIGHT - 2) must accommodate text height at TITLE_SCALE.
  const titleBarH = TITLEBAR_HEIGHT - 2; // = 5

  it("titleBarH accommodates text height at TITLE_SCALE (TITLEBAR_HEIGHT constraint)", () => {
    const { height } = measureText({ text: "X", scale: TITLE_SCALE });
    // A single-char "X" gives the per-line height ceiling.
    expect(height).toBeLessThanOrEqual(titleBarH);
  });

  // ---- per-window width checks ----------------------------------------- //

  // Available title width = windowW - 4 (bevel x2) - closeButtonW(3) - leftPad(1) - rightPad(1)
  function titleAvailW(windowW: number): number {
    return windowW - 4 - 3 - 2;
  }

  it("notepad title fits in notepad window width (90 cells)", () => {
    const { width } = measureText({ text: "NOTEPAD - UNTITLED.TXT", scale: TITLE_SCALE });
    expect(width).toBeLessThanOrEqual(titleAvailW(90));
  });

  it("calculator title fits in calculator window width (60 cells)", () => {
    const { width } = measureText({ text: "CALCULATOR", scale: TITLE_SCALE });
    expect(width).toBeLessThanOrEqual(titleAvailW(60));
  });
});

// ---- regression: scale bumps that break containment -------------------- //

describe("scale regression guards", () => {
  it("TASKBAR_TEXT_SCALE is not larger than 0.5 (START label would overflow)", () => {
    // START label (14.5 cells at 0.5) fits in 19 available. Each step of 0.1
    // adds ~3 cells. Increasing beyond 0.5 risks overflow.
    expect(TASKBAR_TEXT_SCALE).toBeLessThanOrEqual(0.5);
  });

  it("TITLE_SCALE is not larger than 0.6 (title height would exceed titleBarH)", () => {
    // At scale 0.6, text height = 4.2, titleBarH = 5. Next step 0.7 → 4.9 ≤ 5, but
    // 0.8 → 5.6 > 5. Guard at 0.6 to leave headroom.
    expect(TITLE_SCALE).toBeLessThanOrEqual(0.6);
  });
});
