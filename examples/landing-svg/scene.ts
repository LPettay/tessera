import type { Entity, Layer, Scene, VoxelSpriteCell } from "../../src/index.ts";

/**
 * Stylized landing-page scene — voxel-cell take on a marketing homepage.
 *
 * Shows that the same primitives that build a JRPG status screen also
 * compose into something that reads as "website." This is the wedge from
 * the README: the same Scene description scales from marketing hero to
 * game-scale sim. The content here is the marketing-hero end.
 *
 * Layout (100×56):
 *   - Nav bar      (y 1..7):  logo mark + 4 bobbing nav icons
 *   - Hero         (y 10..26): pulsing title block + glow + drifting sparkles
 *   - Feature row  (y 30..44): three cards, each pulsing on a stagger
 *   - Footer       (y 48..54): footer panel + fading "subscribe" cursor
 */

const LAYER = { width: 100, height: 56, cellSize: 12 };

const BG_PANEL = "#0d0d20";
const PANEL_RIM = "#2a2c52";
const NAV_FILL = "#13142b";
const TITLE_BODY = "#fff8d4";
const TITLE_GLOW = "#ffd166";
const ACCENT = "#a8e8ff";
const CARD_BODY = "#1c1d3a";
const CARD_RIM = "#3a4280";
const CARD_RED = "#d4452e";
const CARD_GOLD = "#ffd166";
const CARD_TEAL = "#2ea3d4";
const TEXT = "#dde6ff";
const SPARKLE = "#fff8d4";

function rect(x: number, y: number, w: number, h: number, fill: string): VoxelSpriteCell {
  return { x, y, w, h, fill };
}

// --- Background panel ---------------------------------------------------- //

const bgFrame: Entity = {
  id: "bg-frame",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(0, 0, 100, 56, BG_PANEL)],
    pivot: { x: 0, y: 0 },
  },
};

// --- Nav bar -------------------------------------------------------------- //

const navBarFrame: Entity = {
  id: "nav-bar",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(0, 0, 100, 8, NAV_FILL),
      rect(0, 7, 100, 1, PANEL_RIM),
    ],
    pivot: { x: 0, y: 0 },
  },
};

// Logo mark: small "TESSERA" wordmark on the left of the nav. x=8 keeps
// it inside the slice-crop safe zone (browser crops ~5 cells per side).
const logoMark: Entity = {
  id: "logo-mark",
  position: { x: 8, y: 3 },
  shape: {
    kind: "text",
    text: "TESSERA",
    fill: TITLE_GLOW,
    scale: 0.3,
  },
  animation: { kind: "oscillate", axis: "y", degrees: 8, durationMs: 4400, repeat: "infinite" },
};

// 4 nav icons spaced across the right side of the bar — bobbing on stagger.
type NavSeed = { x: number; color: string; durationMs: number };
const NAV_SEEDS: NavSeed[] = [
  { x: 60, color: ACCENT, durationMs: 1300 },
  { x: 72, color: CARD_GOLD, durationMs: 1500 },
  { x: 84, color: CARD_TEAL, durationMs: 1400 },
  { x: 94, color: CARD_RED, durationMs: 1600 },
];

const navIcons: Entity[] = NAV_SEEDS.map((n, i) => ({
  id: `nav-${i}`,
  position: { x: n.x, y: 4 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(-1, -1, 2, 2, n.color),
      rect(0, 0, 1, 1, TITLE_BODY),
    ],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "bob", amplitude: 0.4, durationMs: n.durationMs, repeat: "infinite" },
}));

// --- Hero ----------------------------------------------------------------- //

// Glow halo behind the title — sized to the typography-scale title.
const heroGlow: Entity = {
  id: "hero-glow",
  position: { x: 50, y: 16 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(-18, -4, 36, 8, TITLE_GLOW),
      rect(-15, -5, 30, 1, TITLE_GLOW),
      rect(-15, 4, 30, 1, TITLE_GLOW),
    ],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "fade", from: 0.05, to: 0.18, durationMs: 2400, repeat: "infinite" },
};

// Title — "TESSERA" at typography scale. scale 0.7 → ~29 cells wide;
// pivot (14, 2.5) centers it.
const heroTitle: Entity = {
  id: "hero-title",
  position: { x: 50, y: 16 },
  shape: {
    kind: "text",
    text: "TESSERA",
    fill: TITLE_BODY,
    scale: 0.7,
    pivot: { x: 14, y: 2.5 },
  },
  animation: { kind: "pulse", from: 1.0, to: 1.06, durationMs: 2400, repeat: "infinite" },
};

// Subtitle — body text, smaller still. scale 0.4 → 47*0.4 ≈ 19 cells wide.
const heroSubtitle: Entity = {
  id: "hero-subtitle",
  position: { x: 50, y: 23 },
  shape: {
    kind: "text",
    text: "VOXEL UI FRAMEWORK",
    fill: TEXT,
    scale: 0.4,
    pivot: { x: 21, y: 1.4 },
  },
};

// --- Feature cards -------------------------------------------------------- //

const CARD_W = 26;
const CARD_H = 14;
const CARD_Y = 30;
const CARD_X = [8, 37, 66];
const CARD_COLORS = [CARD_RED, CARD_GOLD, CARD_TEAL];
const CARD_DURATIONS = [1900, 2200, 2500];
const CARD_TITLES = ["BUILD", "PLAY", "SHIP"];

// Card frames are static (one Entity per card body + rim + title bar);
// the title text and body label are real text entities layered on top.
const cardFrames: Entity[] = CARD_X.map((cx, i) => ({
  id: `card-frame-${i}`,
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(cx, CARD_Y, CARD_W, CARD_H, CARD_RIM),
      rect(cx + 1, CARD_Y + 1, CARD_W - 2, CARD_H - 2, CARD_BODY),
      // Title bar background — title text sits over this.
      rect(cx + 2, CARD_Y + 2, CARD_W - 4, 8, CARD_COLORS[i]!),
    ],
    pivot: { x: 0, y: 0 },
  },
}));

// Card titles — scale 0.6 keeps "BUILD" (29 raw → ~17) inside the card.
const cardTitles: Entity[] = CARD_X.map((cx, i) => ({
  id: `card-title-${i}`,
  position: { x: cx + 3, y: CARD_Y + 4 },
  shape: { kind: "text", text: CARD_TITLES[i]!, fill: CARD_BODY, scale: 0.55 },
}));

// Card accent dots — small entities pulsing inside each card to draw the eye.
const cardAccents: Entity[] = CARD_X.map((cx, i) => ({
  id: `card-accent-${i}`,
  position: { x: cx + CARD_W - 4, y: CARD_Y + 12 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(-1, -1, 2, 2, CARD_COLORS[i]!), rect(0, 0, 1, 1, TITLE_BODY)],
    pivot: { x: 0, y: 0 },
  },
  animation: {
    kind: "pulse",
    from: 0.85,
    to: 1.5,
    durationMs: CARD_DURATIONS[i]!,
    repeat: "infinite",
  },
}));

// --- Footer --------------------------------------------------------------- //

const footerFrame: Entity = {
  id: "footer-frame",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(0, 47, 100, 9, NAV_FILL),
      rect(0, 47, 100, 1, PANEL_RIM),
    ],
    pivot: { x: 0, y: 0 },
  },
};

// Footer copy — small body text on either side.
const footerLeft: Entity = {
  id: "footer-left",
  position: { x: 8, y: 51 },
  shape: { kind: "text", text: "MIT 2026", fill: TEXT, scale: 0.4 },
};

const footerRight: Entity = {
  id: "footer-right",
  position: { x: 80, y: 51 },
  shape: { kind: "text", text: "DOCS", fill: TEXT, scale: 0.4 },
};

// "GET STARTED" CTA — scale 0.5: 65*0.5 ≈ 33 cells; pivot (16, 1.75) centers it.
const footerCta: Entity = {
  id: "footer-cta",
  position: { x: 50, y: 51 },
  shape: {
    kind: "text",
    text: "GET STARTED",
    fill: ACCENT,
    scale: 0.5,
    pivot: { x: 16, y: 1.75 },
  },
  animation: { kind: "fade", from: 0.5, to: 1.0, durationMs: 1300, repeat: "infinite" },
};

// --- Drifting sparkles in the hero --------------------------------------- //

const sparkleCells: VoxelSpriteCell[] = [{ x: 0, y: 0, fill: SPARKLE }];

type SparkleSeed = { x: number; y: number; vx: number; vy: number };
const SPARKLE_SEEDS: SparkleSeed[] = [
  { x: 12, y: 12, vx: 0.5, vy: 0.1 },
  { x: 88, y: 14, vx: -0.45, vy: 0.15 },
  { x: 24, y: 22, vx: 0.4, vy: -0.2 },
  { x: 76, y: 24, vx: -0.5, vy: -0.1 },
  { x: 50, y: 11, vx: 0.2, vy: 0.4 },
  { x: 42, y: 26, vx: -0.3, vy: -0.4 },
];

const sparkles: Entity[] = SPARKLE_SEEDS.map((s, i) => ({
  id: `sparkle-${i}`,
  position: { x: s.x, y: s.y },
  shape: { kind: "voxel-sprite", cells: sparkleCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "drift", velocity: { x: s.vx, y: s.vy } },
}));

// --- Layers --------------------------------------------------------------- //

const backgroundLayer: Layer = {
  id: "bg",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [bgFrame, ...sparkles],
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
    navBarFrame,
    logoMark,
    ...navIcons,
    heroGlow,
    heroTitle,
    heroSubtitle,
    ...cardFrames,
    ...cardTitles,
    ...cardAccents,
    footerFrame,
    footerLeft,
    footerRight,
    footerCta,
  ],
  zIndex: 1,
  opacity: 1,
  visible: true,
};

export const landingScene: Scene = {
  layers: [backgroundLayer, contentLayer],
};
