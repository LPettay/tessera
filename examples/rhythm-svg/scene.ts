import type { Entity, Layer, Scene, VoxelSpriteCell } from "../../src/index.ts";

/**
 * Rhythm-game HUD. The densest of the three v0.2.x demo scenes —
 * exercises every Animation kind in one frame:
 *   - spin   → 4 receptor targets at the bottom of the lanes (vector entities)
 *   - drift  → 12 notes traveling down the lanes
 *   - pulse  → score block, combo counter, lane receptor cores
 *   - bob    → side character avatars
 *   - fade   → groove-bar pulse, "PRESS BEAT" cursor
 *   - oscillate → background visualizer bars
 */

const LAYER = { width: 120, height: 60, cellSize: 10 };

const BG = "#08081c";
const PANEL = "#15173a";
const PANEL_RIM = "#3a4280";
const LANE = "#1d1f44";
const LANE_RIM = "#3a4280";
const RECEPTOR_BODY = "#2ea3d4";
const RECEPTOR_CORE = "#a8e8ff";
const NOTE_HOT = "#ffd166";
const NOTE_COOL = "#2ea3d4";
const NOTE_HOT_RIM = "#f57350";
const NOTE_COOL_RIM = "#1f6e96";
const COMBO = "#fff2c2";
const COMBO_RIM = "#ffd166";
const GROOVE_BG = "#3a1a55";
const GROOVE_FILL = "#d4452e";
const GROOVE_PULSE = "#ffd166";
const TEXT = "#dde6ff";
const SPARKLE = "#fff8d4";
const AVATAR_RED = "#d4452e";
const AVATAR_BLUE = "#2ea3d4";
const AVATAR_HIGHLIGHT = "#fff8d4";
const VISUALIZER = "#3a4280";

function rect(x: number, y: number, w: number, h: number, fill: string): VoxelSpriteCell {
  return { x, y, w, h, fill };
}

// --- Background frame ---------------------------------------------------- //

const bgFrame: Entity = {
  id: "bg",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(0, 0, 120, 60, BG)],
    pivot: { x: 0, y: 0 },
  },
};

// --- Background visualizer bars ---------------------------------------- //
// Vertical bars on the far edges that oscillate via... well, oscillate
// rotates, not scales. So we fake EQ-bar height with a stacked entity that
// pulses (scale-Y not supported separately, so uniform scale is the
// approximation). Cheap effect, reads as "the music is alive".

const visualizerBars: Entity[] = [];
for (let i = 0; i < 6; i++) {
  const x = 4 + i * 3;
  visualizerBars.push({
    id: `vis-l-${i}`,
    position: { x, y: 50 },
    shape: {
      kind: "voxel-sprite",
      cells: [rect(0, -8, 2, 8, VISUALIZER)],
      pivot: { x: 0, y: 0 },
    },
    animation: {
      kind: "pulse",
      from: 0.4,
      to: 1.0,
      durationMs: 600 + i * 70,
      repeat: "infinite",
    },
  });
  visualizerBars.push({
    id: `vis-r-${i}`,
    position: { x: 117 - i * 3, y: 50 },
    shape: {
      kind: "voxel-sprite",
      cells: [rect(-2, -8, 2, 8, VISUALIZER)],
      pivot: { x: 0, y: 0 },
    },
    animation: {
      kind: "pulse",
      from: 0.4,
      to: 1.0,
      durationMs: 640 + i * 70,
      repeat: "infinite",
    },
  });
}

// --- Lanes --------------------------------------------------------------- //

const LANE_LEFT = 44;
const LANE_W = 8;
const LANE_GAP = 2;
const LANE_TOP = 4;
const LANE_BOTTOM = 48;

const laneFrame: Entity = (() => {
  const cells: VoxelSpriteCell[] = [];
  for (let i = 0; i < 4; i++) {
    const lx = LANE_LEFT + i * (LANE_W + LANE_GAP);
    cells.push(rect(lx, LANE_TOP, LANE_W, LANE_BOTTOM - LANE_TOP, LANE));
    cells.push(rect(lx, LANE_TOP, 1, LANE_BOTTOM - LANE_TOP, LANE_RIM));
    cells.push(
      rect(lx + LANE_W - 1, LANE_TOP, 1, LANE_BOTTOM - LANE_TOP, LANE_RIM),
    );
  }
  // Receptor strip at the bottom
  cells.push(rect(LANE_LEFT - 2, LANE_BOTTOM, 4 * (LANE_W + LANE_GAP) + 2, 2, PANEL_RIM));
  return {
    id: "lanes",
    position: { x: 0, y: 0 },
    shape: { kind: "voxel-sprite", cells, pivot: { x: 0, y: 0 } },
  };
})();

// --- Receptors (spinning vector targets) ------------------------------- //
// Small 4-spoke targets at the bottom of each lane, spun via vector
// entities (so rotation rasterizes to axis-aligned cells per ADR 0014
// instead of becoming tilted parallelograms).

const receptors: Entity[] = [];
for (let i = 0; i < 4; i++) {
  const cx = LANE_LEFT + i * (LANE_W + LANE_GAP) + Math.floor(LANE_W / 2);
  const cy = LANE_BOTTOM - 3;
  receptors.push({
    id: `receptor-${i}`,
    position: { x: cx, y: cy },
    shape: {
      kind: "vector",
      pivot: { x: 0, y: 0 },
      segments: [
        { kind: "line", from: { x: -2, y: 0 }, to: { x: 2, y: 0 }, thickness: 1, fill: RECEPTOR_BODY },
        { kind: "line", from: { x: 0, y: -2 }, to: { x: 0, y: 2 }, thickness: 1, fill: RECEPTOR_BODY },
      ],
    },
    animation: {
      kind: "spin",
      axis: "z",
      durationMs: 4000 + i * 250,
      direction: i % 2 === 0 ? "cw" : "ccw",
      repeat: "infinite",
    },
  });
  // Pulsing core dot at the receptor center.
  receptors.push({
    id: `receptor-core-${i}`,
    position: { x: cx, y: cy },
    shape: {
      kind: "voxel-sprite",
      cells: [rect(-1, -1, 2, 2, RECEPTOR_CORE)],
      pivot: { x: 0, y: 0 },
    },
    animation: {
      kind: "pulse",
      from: 0.7,
      to: 1.4,
      durationMs: 600 + i * 80,
      repeat: "infinite",
    },
  });
}

// --- Notes traveling down lanes (drift) ------------------------------- //

type NoteSeed = { lane: number; y: number; hot: boolean };
const NOTE_SEEDS: NoteSeed[] = [
  { lane: 0, y: 6, hot: true },
  { lane: 1, y: 14, hot: false },
  { lane: 2, y: 10, hot: true },
  { lane: 3, y: 18, hot: false },
  { lane: 0, y: 24, hot: false },
  { lane: 2, y: 28, hot: true },
  { lane: 1, y: 32, hot: false },
  { lane: 3, y: 34, hot: true },
  { lane: 0, y: 40, hot: true },
  { lane: 2, y: 42, hot: false },
  { lane: 1, y: 8, hot: true },
  { lane: 3, y: 5, hot: true },
];

const notes: Entity[] = NOTE_SEEDS.map((n, i) => {
  const lx = LANE_LEFT + n.lane * (LANE_W + LANE_GAP) + Math.floor(LANE_W / 2);
  const body = n.hot ? NOTE_HOT : NOTE_COOL;
  const rim = n.hot ? NOTE_HOT_RIM : NOTE_COOL_RIM;
  return {
    id: `note-${i}`,
    position: { x: lx, y: n.y },
    shape: {
      kind: "voxel-sprite",
      cells: [
        rect(-3, -1, 6, 2, rim),
        rect(-2, -1, 4, 2, body),
        rect(-1, -1, 2, 1, AVATAR_HIGHLIGHT),
      ],
      pivot: { x: 0, y: 0 },
    },
    // Drift downward at varied speeds — feels like notes streaming in.
    animation: { kind: "drift", velocity: { x: 0, y: 6 + (i % 3) } },
  };
});

// --- Score block (top-left, pulses) ----------------------------------- //

const scoreFrame: Entity = {
  id: "score-frame",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(2, 2, 30, 8, PANEL_RIM),
      rect(3, 3, 28, 6, PANEL),
      // "SCORE" label row
      rect(4, 4, 8, 1, TEXT),
      // Score digits
      rect(13, 4, 18, 2, COMBO),
      rect(13, 7, 12, 1, "#8094c8"),
    ],
    pivot: { x: 0, y: 0 },
  },
};

// Pulsing accent on the score (faked "you just scored" feedback).
const scorePulse: Entity = {
  id: "score-pulse",
  position: { x: 30, y: 5 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(-1, -1, 2, 2, NOTE_HOT)],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "pulse", from: 0.6, to: 1.6, durationMs: 800, repeat: "infinite" },
};

// --- Combo counter (top-right, pulses bigger) ------------------------- //

const comboFrame: Entity = {
  id: "combo-frame",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(94, 2, 24, 12, COMBO_RIM),
      rect(95, 3, 22, 10, PANEL),
      // "COMBO" label
      rect(98, 4, 8, 1, TEXT),
      // Big combo number block
      rect(98, 7, 16, 4, COMBO),
    ],
    pivot: { x: 0, y: 0 },
  },
};

// The combo number itself pulses to feel alive.
const comboNumber: Entity = {
  id: "combo-number",
  position: { x: 106, y: 9 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(-7, -2, 14, 4, NOTE_HOT)],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "pulse", from: 0.92, to: 1.1, durationMs: 500, repeat: "infinite" },
};

// --- Groove bar (bottom, fades) -------------------------------------- //

const grooveFrame: Entity = {
  id: "groove-frame",
  position: { x: 0, y: 0 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(20, 53, 80, 4, PANEL_RIM),
      rect(21, 54, 78, 2, GROOVE_BG),
      // Filled portion (~70%)
      rect(21, 54, 54, 2, GROOVE_FILL),
    ],
    pivot: { x: 0, y: 0 },
  },
};

// Pulse highlight on the groove bar tip.
const groovePulse: Entity = {
  id: "groove-pulse",
  position: { x: 75, y: 55 },
  shape: {
    kind: "voxel-sprite",
    cells: [rect(-2, -1, 4, 2, GROOVE_PULSE)],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "fade", from: 0.3, to: 1.0, durationMs: 700, repeat: "infinite" },
};

// --- Side avatars (bob) ---------------------------------------------- //

function avatarCells(body: string): VoxelSpriteCell[] {
  return [
    // Head
    rect(-3, -5, 6, 4, body),
    rect(-2, -4, 4, 2, AVATAR_HIGHLIGHT),
    // Eyes
    rect(-2, -3, 1, 1, BG),
    rect(1, -3, 1, 1, BG),
    // Body
    rect(-4, -1, 8, 5, body),
    rect(-3, 0, 6, 3, AVATAR_HIGHLIGHT),
    // Arms
    rect(-5, 0, 1, 3, body),
    rect(4, 0, 1, 3, body),
  ];
}

const avatarLeft: Entity = {
  id: "avatar-left",
  position: { x: 22, y: 28 },
  shape: { kind: "voxel-sprite", cells: avatarCells(AVATAR_RED), pivot: { x: 0, y: 0 } },
  animation: { kind: "bob", amplitude: 1.2, durationMs: 1100, repeat: "infinite" },
};

const avatarRight: Entity = {
  id: "avatar-right",
  position: { x: 98, y: 28 },
  shape: { kind: "voxel-sprite", cells: avatarCells(AVATAR_BLUE), pivot: { x: 0, y: 0 } },
  animation: { kind: "bob", amplitude: 1.2, durationMs: 1250, repeat: "infinite" },
};

// --- "PRESS BEAT" cursor (fade) -------------------------------------- //

const pressBeat: Entity = {
  id: "press-beat",
  position: { x: 60, y: 52 },
  shape: {
    kind: "voxel-sprite",
    cells: [
      rect(-7, -1, 14, 2, COMBO),
      rect(-6, 0, 12, 1, AVATAR_HIGHLIGHT),
    ],
    pivot: { x: 0, y: 0 },
  },
  animation: { kind: "fade", from: 0.25, to: 1.0, durationMs: 600, repeat: "infinite" },
};

// --- Drifting background sparkles ------------------------------------ //

const sparkleCells: VoxelSpriteCell[] = [{ x: 0, y: 0, fill: SPARKLE }];

type SparkleSeed = { x: number; y: number; vx: number; vy: number };
const SPARKLE_SEEDS: SparkleSeed[] = [
  { x: 8, y: 16, vx: 0.0, vy: 0.6 },
  { x: 14, y: 4, vx: 0.0, vy: 0.5 },
  { x: 110, y: 14, vx: 0.0, vy: 0.55 },
  { x: 105, y: 4, vx: 0.0, vy: 0.65 },
  { x: 36, y: 50, vx: -0.2, vy: -0.3 },
  { x: 86, y: 50, vx: 0.2, vy: -0.3 },
];

const sparkles: Entity[] = SPARKLE_SEEDS.map((s, i) => ({
  id: `sparkle-${i}`,
  position: { x: s.x, y: s.y },
  shape: { kind: "voxel-sprite", cells: sparkleCells, pivot: { x: 0, y: 0 } },
  animation: { kind: "drift", velocity: { x: s.vx, y: s.vy } },
}));

// --- Layers ---------------------------------------------------------- //

const backgroundLayer: Layer = {
  id: "bg",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [bgFrame, ...sparkles, ...visualizerBars],
  zIndex: 0,
  opacity: 1,
  visible: true,
};

const playfieldLayer: Layer = {
  id: "playfield",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [laneFrame, ...notes, ...receptors],
  zIndex: 1,
  opacity: 1,
  visible: true,
};

const hudLayer: Layer = {
  id: "hud",
  cellSize: LAYER.cellSize,
  width: LAYER.width,
  height: LAYER.height,
  entities: [
    scoreFrame,
    scorePulse,
    comboFrame,
    comboNumber,
    grooveFrame,
    groovePulse,
    avatarLeft,
    avatarRight,
    pressBeat,
  ],
  zIndex: 2,
  opacity: 1,
  visible: true,
};

export const rhythmScene: Scene = {
  layers: [backgroundLayer, playfieldLayer, hudLayer],
};
