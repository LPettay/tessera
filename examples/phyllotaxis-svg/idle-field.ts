/**
 * Idle "living spiral" field — composes a slow sinusoidal radial breathing
 * with the cursor-repulsion field from `windows-svg/cursor-field.ts`.
 *
 * Why both in one hook?
 *   `setOffset(layerId, entityId, dx, dy)` REPLACES the current frame's
 *   offset for that entity (see ADR 0024, src/core/renderer.ts). Two
 *   independent `onFrame` hooks both calling `setOffset` for the same
 *   entity would have the second-registered hook win — the displacements
 *   would NOT compose. So we sum the two contributions in a single hook
 *   and call `setOffset` once per entity.
 *
 * Idle motion:
 *   Each phyllotaxis dot indexed `n` is pushed radially outward by
 *
 *     a · sin(ω·t + φ·n)
 *
 *   where `a` is the breathing amplitude in cells, `ω` controls the global
 *   tempo, and `φ` is a small per-index phase offset that makes the wave
 *   travel along the spiral arms instead of every dot pulsing in unison.
 *   Centre-of-scene dots get a slightly damped amplitude so the very middle
 *   doesn't visibly swirl into itself.
 *
 * Reduced-motion:
 *   `withPageCitizenship` already pauses the entire renderer loop when
 *   `prefers-reduced-motion: reduce` is set, which kills both idle motion
 *   and cursor reactivity. We additionally short-circuit the idle term
 *   inside the hook so that even if a future caller installs us on a
 *   bare controller, idle breathing still respects the user preference.
 */

import type {
  Entity,
  FrameContext,
  Layer,
  RendererController,
  Scene,
} from "../../src/index.ts";

export type IdleFieldOptions = {
  /** Cursor-repulsion radius in viewBox units. See cursor-field.ts. */
  cursorRadius: number;
  /** Cursor-repulsion max push in cell units of each entity's parent layer. */
  cursorMaxDisplacement: number;
  /** Cursor-repulsion falloff; default `"smooth"`. */
  cursorFalloff?: "linear" | "smooth";
  /**
   * Idle breathing amplitude in cell units of each entity's parent layer.
   * Default 0.6 — enough to be obviously alive, small enough to read as
   * intentional rather than jittery on a 8px-cell layer.
   */
  idleAmplitude?: number;
  /**
   * Idle breathing angular frequency in rad/ms (FrameContext.elapsed is
   * milliseconds). Default `2π / 6000` → one full inhale-exhale every
   * 6 seconds. Slower than the eye expects of "animation", which makes
   * the spiral feel like it's quietly alive instead of mechanical.
   */
  idleOmega?: number;
  /**
   * Per-index phase offset in radians. With ~500 dots and 0.18 rad/dot
   * the wave wraps roughly 14 times around the spiral, producing visible
   * travelling bands along the Fibonacci arms.
   */
  idlePhasePerIndex?: number;
};

type EntityRef = {
  layerId: string;
  entityId: string;
  /** Snapshot of position in parent-layer cell space at install time. */
  x: number;
  y: number;
  cellSize: number;
  /** Index `n` parsed from `phyllotaxis.dot.{n}` for phase keying.
   *  Falls back to insertion order for non-phyllotaxis entities. */
  index: number;
  /** Unit vector pointing from scene centre to the dot — the radial
   *  direction we breathe along. (0, 0) for the centre dot. */
  radialX: number;
  radialY: number;
  /** 0 at the centre, 1 at the outermost dot in the snapshot. Used to
   *  damp the centre amplitude so the middle doesn't cannibalise itself. */
  radialNorm: number;
};

const PHYLLOTAXIS_ID_PREFIX = "phyllotaxis.dot.";

/**
 * Detect the OS-level reduced-motion preference at install time. The
 * page-citizenship wrapper already auto-pauses on this signal, but we
 * also check it here so an idle hook installed on a bare controller
 * does the right thing.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Install the combined idle + cursor field on a controller. The two
 * displacements are summed per entity each frame and committed via a
 * single `setOffset` call. Returns a dispose function that cancels the
 * underlying `onFrame` registration.
 */
export function installIdleField(
  controller: RendererController,
  scene: Scene,
  opts: IdleFieldOptions,
): () => void {
  const cursorRadius = opts.cursorRadius;
  const cursorMax = opts.cursorMaxDisplacement;
  const cursorFalloff: "linear" | "smooth" = opts.cursorFalloff ?? "smooth";
  const idleAmp = opts.idleAmplitude ?? 0.6;
  // Default period is 6s. `elapsed` is ms, so omega is rad/ms.
  const idleOmega = opts.idleOmega ?? (2 * Math.PI) / 6000;
  const idlePhasePerIndex = opts.idlePhasePerIndex ?? 0.18;
  const idleEnabled = !prefersReducedMotion();

  // Snapshot phase — record every entity's install-time cell-space
  // position plus a precomputed radial unit vector keyed off the layer's
  // centre. Both idle and cursor terms use this snapshot, never the
  // live entity (which doesn't move; only its render transform does).
  const refs: EntityRef[] = [];
  for (const layer of scene.layers as Layer[]) {
    const cellSize = layer.cellSize;
    const cx = (layer.width - 1) / 2;
    const cy = (layer.height - 1) / 2;
    let layerMaxR = 0;
    const layerStart = refs.length;
    for (const entity of layer.entities as Entity[]) {
      const dx = entity.position.x - cx;
      const dy = entity.position.y - cy;
      const r = Math.hypot(dx, dy);
      if (r > layerMaxR) layerMaxR = r;
      const indexFromId = parseEntityIndex(entity.id, refs.length);
      refs.push({
        layerId: layer.id,
        entityId: entity.id,
        x: entity.position.x,
        y: entity.position.y,
        cellSize,
        index: indexFromId,
        radialX: r > 0 ? dx / r : 0,
        radialY: r > 0 ? dy / r : 0,
        radialNorm: r, // normalised once we know layerMaxR
      });
    }
    // Second pass: normalise radialNorm to [0, 1] now we know the max.
    if (layerMaxR > 0) {
      for (let i = layerStart; i < refs.length; i++) {
        refs[i]!.radialNorm = refs[i]!.radialNorm / layerMaxR;
      }
    }
  }

  if (refs.length === 0) {
    return controller.onFrame(() => {});
  }

  const cursorActive = cursorRadius > 0 && cursorMax !== 0;

  return controller.onFrame((ctx: FrameContext) => {
    const cursor = ctx.cursor;
    const elapsed = ctx.elapsed;

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i]!;

      // Idle term — radial breathing. Damp the inner ~10% so the very
      // centre dot doesn't visibly stutter (its radial vector is (0,0)
      // anyway, but neighbours within the hub also feel chaotic if
      // amplitude is full there).
      let idleDx = 0;
      let idleDy = 0;
      if (idleEnabled) {
        const damp = smoothstep(0.05, 0.25, ref.radialNorm);
        const phase = idleOmega * elapsed + idlePhasePerIndex * ref.index;
        const breath = idleAmp * damp * Math.sin(phase);
        idleDx = ref.radialX * breath;
        idleDy = ref.radialY * breath;
      }

      // Cursor term — same logic as installCursorField, inlined so we
      // can sum into the same setOffset call.
      let cursorDx = 0;
      let cursorDy = 0;
      if (cursorActive && cursor !== null) {
        const cellSize = ref.cellSize;
        const cursorXCells = cursor.x / cellSize;
        const cursorYCells = cursor.y / cellSize;
        const dx = ref.x - cursorXCells;
        const dy = ref.y - cursorYCells;
        const distCells = Math.hypot(dx, dy);
        const distVB = distCells * cellSize;
        if (distVB < cursorRadius) {
          let t = 1 - distVB / cursorRadius;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;
          const strength =
            cursorFalloff === "smooth" ? t * t * (3 - 2 * t) : t;
          let dirX: number;
          let dirY: number;
          if (distCells > 0) {
            dirX = dx / distCells;
            dirY = dy / distCells;
          } else {
            dirX = 1;
            dirY = 0;
          }
          cursorDx = dirX * strength * cursorMax;
          cursorDy = dirY * strength * cursorMax;
        }
      }

      const totalDx = idleDx + cursorDx;
      const totalDy = idleDy + cursorDy;
      // Skip the call entirely if both contributions are negligible —
      // saves a Map write for entities far from the cursor when idle is
      // disabled, and lets static-when-zero entities settle to baseline.
      if (totalDx === 0 && totalDy === 0) continue;
      ctx.setOffset(ref.layerId, ref.entityId, totalDx, totalDy);
    }
  });
}

function parseEntityIndex(id: string, fallback: number): number {
  if (id.startsWith(PHYLLOTAXIS_ID_PREFIX)) {
    const n = Number(id.slice(PHYLLOTAXIS_ID_PREFIX.length));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Cubic smoothstep, clamped to [0, 1]. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  let t = (x - edge0) / (edge1 - edge0);
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}
