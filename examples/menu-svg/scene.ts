import type { Entity, Layer, Scene, VoxelSpriteCell } from "../../src/index.ts";

/**
 * Stylized title-screen scene — exercises the v0.2.x non-rotation Animation
 * kinds (ADR 0016): drifting sparkles, pulsing sun logo, bobbing menu icons,
 * fading "press start" cursor. Each entity uses exactly one animation; the
 * goal is to demonstrate the leaf-kind palette in a single coherent scene
 * rather than a sterile per-kind grid.
 *
 * One animation per entity is the current ceiling — composition lands in a
 * future ADR.
 */

const LAYER = { width: 100, height: 56, cellSize: 12 };

const STAR = "#fff8d4";
const SUN_CORE = "#fff2c2";
const SUN_BODY = "#ffd166";
const SUN_RIM = "#f57350";
const ICON_RED = "#d4452e";
const ICON_GOLD = "#ffd166";
const ICON_TEAL = "#2ea3d4";
const ICON_HIGHLIGHT = "#fff8d4";
const CURSOR = "#a8e8ff";

// --- Drifting sparkles ---------------------------------------------------- //
// Single-cell entities scattered across the layer with varied velocities.
// drift is unbounded — sparkles eventually leave the viewport. That's
// intentional for the demo: it shows continuous translation honestly rather
// than faking wraparound.

const sparkleCells: VoxelSpriteCell[] = [{ x: 0, y: 0, fill: STAR }];

type SparkleSeed = { id: string; x: number; y: number; vx: number; vy: number };

const SPARKLE_SEEDS: SparkleSeed[] = [
  { id: "sp1", x: 8, y: 6, vx: 0.6, vy: 0.25 },
  { id: "sp2", x: 92, y: 9, vx: -0.5, vy: 0.35 },
  { id: "sp3", x: 18, y: 50, vx: 0.7, vy: -0.4 },
  { id: "sp4", x: 80, y: 48, vx: -0.55, vy: -0.3 },
  { id: "sp5", x: 45, y: 4, vx: 0.3, vy: 0.5 },
  { id: "sp6", x: 60, y: 52, vx: -0.35, vy: -0.55 },
  { id: "sp7", x: 4, y: 28, vx: 0.8, vy: 0.0 },
  { id: "sp8", x: 96, y: 30, vx: -0.8, vy: 0.0 },
];

const sparkles: Entity[] = SPARKLE_SEEDS.map((s) => ({
  id: s.id,
  position: { x: s.x, y: s.y },
  shape: { kind: "voxel-sprite", cells: sparkleCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "drift", velocity: { x: s.vx, y: s.vy } },
}));

// --- Pulsing sun logo ----------------------------------------------------- //
// Centered diamond-shape voxel-sprite. Pulses between 1.0 and 1.12 — subtle
// breathing rather than aggressive zoom, matching the "title screen idle"
// vibe.

const sunCells: VoxelSpriteCell[] = [
  { x: 0, y: -3, fill: SUN_RIM },
  { x: -1, y: -2, fill: SUN_BODY },
  { x: 0, y: -2, fill: SUN_CORE },
  { x: 1, y: -2, fill: SUN_BODY },
  { x: -2, y: -1, fill: SUN_BODY },
  { x: -1, y: -1, fill: SUN_CORE },
  { x: 0, y: -1, fill: SUN_CORE },
  { x: 1, y: -1, fill: SUN_CORE },
  { x: 2, y: -1, fill: SUN_BODY },
  { x: -3, y: 0, fill: SUN_RIM },
  { x: -2, y: 0, fill: SUN_BODY },
  { x: -1, y: 0, fill: SUN_CORE },
  { x: 0, y: 0, fill: SUN_CORE },
  { x: 1, y: 0, fill: SUN_CORE },
  { x: 2, y: 0, fill: SUN_BODY },
  { x: 3, y: 0, fill: SUN_RIM },
  { x: -2, y: 1, fill: SUN_BODY },
  { x: -1, y: 1, fill: SUN_CORE },
  { x: 0, y: 1, fill: SUN_CORE },
  { x: 1, y: 1, fill: SUN_CORE },
  { x: 2, y: 1, fill: SUN_BODY },
  { x: -1, y: 2, fill: SUN_BODY },
  { x: 0, y: 2, fill: SUN_CORE },
  { x: 1, y: 2, fill: SUN_BODY },
  { x: 0, y: 3, fill: SUN_RIM },
];

const sun: Entity = {
  id: "sun",
  position: { x: 50, y: 22 },
  shape: { kind: "voxel-sprite", cells: sunCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "pulse", from: 1.0, to: 1.12, durationMs: 1800, repeat: "infinite" },
};

// --- Bobbing menu icons --------------------------------------------------- //
// Three small square icons with a highlight pixel. Per-icon `durationMs`
// values are deliberately offset so the trio drifts out of phase — the
// composition ADR will introduce a real `delay`/`phase`, but until then,
// staggered durations are the cheap way to avoid robotic in-sync motion.

function iconCells(body: string): VoxelSpriteCell[] {
  return [
    { x: -2, y: -2, w: 4, h: 4, fill: body },
    { x: -1, y: -1, w: 2, h: 2, fill: ICON_HIGHLIGHT },
  ];
}

const menu: Entity[] = [
  {
    id: "menu-fight",
    position: { x: 32, y: 40 },
    shape: { kind: "voxel-sprite", cells: iconCells(ICON_RED), pivot: { x: 0, y: 0 } },
    animation: { kind: "bob", amplitude: 0.9, durationMs: 1400, repeat: "infinite" },
  },
  {
    id: "menu-magic",
    position: { x: 50, y: 40 },
    shape: { kind: "voxel-sprite", cells: iconCells(ICON_GOLD), pivot: { x: 0, y: 0 } },
    animation: { kind: "bob", amplitude: 0.9, durationMs: 1550, repeat: "infinite" },
  },
  {
    id: "menu-item",
    position: { x: 68, y: 40 },
    shape: { kind: "voxel-sprite", cells: iconCells(ICON_TEAL), pivot: { x: 0, y: 0 } },
    animation: { kind: "bob", amplitude: 0.9, durationMs: 1700, repeat: "infinite" },
  },
];

// --- Fading press-start cursor ------------------------------------------- //
// A short horizontal bar near the bottom that fades opacity 0.2 ↔ 1.0.

const cursorCells: VoxelSpriteCell[] = [{ x: -3, y: 0, w: 6, h: 1, fill: CURSOR }];

const cursor: Entity = {
  id: "press-start",
  position: { x: 50, y: 50 },
  shape: { kind: "voxel-sprite", cells: cursorCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "fade", from: 0.2, to: 1.0, durationMs: 1100, repeat: "infinite" },
};

// --- Layers --------------------------------------------------------------- //

const backgroundLayer: Layer = {
  id: "bg",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: sparkles,
  zIndex: 0,
  opacity: 1,
  visible: true,
};

const foregroundLayer: Layer = {
  id: "fg",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [sun, ...menu, cursor],
  zIndex: 1,
  opacity: 1,
  visible: true,
};

export const menuScene: Scene = {
  layers: [backgroundLayer, foregroundLayer],
};
