/**
 * Scene description language.
 *
 * A Scene is pure data — no methods, no behavior. Renderers consume Scenes
 * and produce visuals. The same Scene object can be passed to any renderer
 * tier (SVG, Canvas2D, WebGL2) and produce equivalent output within the
 * tier's capability ceiling.
 *
 * Nothing in this file imports anything; the engine core has zero runtime
 * deps and zero internal coupling. See ADR 0006.
 */

/**
 * The top-level scene description. An ordered list of layers.
 *
 * Layer draw order is determined by `Layer.zIndex`, not array position;
 * the array is stable storage, zIndex is the visual stack.
 */
export type Scene = {
  layers: Layer[];
};

/**
 * A 2D voxel layer — a uniform cell grid plus dynamic entities.
 *
 * `width` × `height` are in CELL units, not pixels. The layer's pixel size
 * is `cellSize * width` by `cellSize * height`.
 *
 * Cells form an optional sparse grid. Most v0.1 layers will have no cells
 * and only entities; layer-level cells become primary in v0.2+. Entities
 * are positioned in cell coordinates (may be fractional) and animate
 * independently of the cell grid.
 */
export type Layer = {
  /** Unique within a Scene. */
  id: string;
  /** Pixel size of one cell. Cells are square. */
  cellSize: number;
  /** Grid width in cells. */
  width: number;
  /** Grid height in cells. */
  height: number;
  /** Sparse grid cells. Undefined or empty = no static cell content. */
  cells?: Cell[];
  /** Dynamic entities positioned in this layer's cell space. */
  entities: Entity[];
  /** Stack order. Higher zIndex draws on top. */
  zIndex: number;
  /** 0..1, applied to the entire layer. */
  opacity: number;
  /** When false, the layer is skipped at draw time. */
  visible: boolean;
};

/**
 * A single sparse cell. Position is in the parent Layer's cell coordinates.
 */
export type Cell = {
  x: number;
  y: number;
  /** Solid fill, hex string ("#rrggbb"). */
  fill: string;
};

/**
 * A dynamic, positioned, optionally animated thing.
 *
 * Entities can sit at non-integer cell positions, span multiple cells, and
 * animate independently of the cell grid. The entity's own visual is
 * described by its `shape`.
 */
export type Entity = {
  /** Unique within the parent Layer. */
  id: string;
  /**
   * Position in the parent layer's cell coordinates. May be fractional.
   * The entity's `shape.pivot` determines where this point lands inside
   * the entity's visual.
   */
  position: { x: number; y: number };
  shape: EntityShape;
  animation?: Animation;
};

/**
 * The visual representation of an entity. Tagged union — discriminate by `kind`.
 *
 * - `voxel-sprite`: a fixed grid of cells. Animation transforms apply to the
 *   entire group (CSS transform on the entity's `<g>`). At non-cardinal
 *   rotation angles, individual cells become tilted parallelograms — fine for
 *   small rotations and oscillation, bad for in-plane spin.
 * - `vector`: a list of continuous segments. The renderer rasterizes the
 *   segments onto the cell grid PER FRAME, applying animation transforms to
 *   segment endpoints first. Cells stay axis-aligned at every angle — true
 *   pixel-art rotation. Slightly more CPU per frame but visually correct.
 *   See ADR 0014.
 */
export type EntityShape =
  | {
      kind: "voxel-sprite";
      /** Cells of the sprite, in entity-local cell coordinates (origin top-left). */
      cells: VoxelSpriteCell[];
      /**
       * Center of rotation/anchor in entity-local cell coordinates.
       * When omitted, defaults to the centroid of `cells`.
       */
      pivot?: { x: number; y: number };
    }
  | {
      kind: "vector";
      /** Continuous segments composing the shape. */
      segments: VectorSegment[];
      /**
       * Center of rotation in entity-local cell coordinates. Defaults to
       * `(0, 0)` — segments are typically authored with origin as the pivot.
       */
      pivot?: { x: number; y: number };
    };

/**
 * A drawable segment within a `vector` shape. Tagged union — discriminate
 * by `kind`. All coordinates are in entity-local cell units (fractional
 * allowed); the renderer rasterizes each segment to axis-aligned cells.
 *
 * - `line`: constant-thickness band from `from` to `to`.
 * - `wedge`: tapered band that widens from `apex` (single cell) to a base
 *   `baseWidth` cells across at `baseCenter`. Useful for "rays of light"
 *   that meet at a single point and widen toward the page border.
 */
export type VectorSegment = LineSegment | WedgeSegment;

export type LineSegment = {
  kind: "line";
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Width of the rasterized band in cells. Must be ≥ 1. */
  thickness: number;
  /** Solid fill color, hex string. */
  fill: string;
};

export type WedgeSegment = {
  kind: "wedge";
  /** Narrow end. Width here is implicitly 1 cell. */
  apex: { x: number; y: number };
  /** Wide end (centerline). */
  baseCenter: { x: number; y: number };
  /** Width at `baseCenter`, in cells. Linearly interpolated from apex (1) to base. */
  baseWidth: number;
  /** Solid fill color, hex string. */
  fill: string;
};

/**
 * A single rectangle within a voxel-sprite. Coordinates and sizes are in
 * entity-local cell units. `w` and `h` default to 1.
 */
export type VoxelSpriteCell = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill: string;
};

/**
 * Declarative animation applied to an entity. Tagged union — discriminate
 * by `kind`.
 *
 * Two families:
 *  - Oscillate-family (sine-eased, bounded, `repeat` required):
 *    `oscillate` (rotate), `pulse` (scale), `bob` (translate-Y), `fade` (opacity).
 *  - Continuous-family (constant rate, unbounded):
 *    `spin` (rotate), `drift` (translate).
 *
 * Composition (multiple animations on one entity) is intentionally not
 * supported here — that's a future ADR. Today an entity has at most one
 * animation. Adding a new kind is additive at the type level, but
 * exhaustive consumer code must add a branch.
 */
export type Animation =
  | OscillateAnimation
  | SpinAnimation
  | PulseAnimation
  | BobAnimation
  | FadeAnimation
  | DriftAnimation;

/**
 * Sine-eased back-and-forth rotation.
 *
 * v0.1 SVG renderer animates only `axis: "y"` (faux-3D); "x" and "z" are
 * reserved in the type but no-op in the SVG tier. Higher tiers may
 * implement them.
 */
export type OscillateAnimation = {
  kind: "oscillate";
  axis: "x" | "y" | "z";
  /** Amplitude in degrees. Rotation oscillates between `-degrees` and `+degrees`. */
  degrees: number;
  /** One full oscillation period in milliseconds. */
  durationMs: number;
  /** Iteration count: a positive integer or `"infinite"`. */
  repeat: number | "infinite";
};

/**
 * Continuous rotation at a constant rate.
 *
 * v0.1 SVG renderer animates only `axis: "z"` (in-plane rotation). "x"
 * and "y" are reserved in the type but no-op in the SVG tier.
 */
export type SpinAnimation = {
  kind: "spin";
  axis: "x" | "y" | "z";
  /** Time for one full revolution in milliseconds. */
  durationMs: number;
  /** Rotation direction. `cw` = clockwise, `ccw` = counter-clockwise. */
  direction: "cw" | "ccw";
  /** Iteration count: a positive integer or `"infinite"`. Defaults to `"infinite"`. */
  repeat?: number | "infinite";
};

/**
 * Sine-eased rhythmic scale. The entity scales between `from` and `to`
 * and back, once per `durationMs`. Asymmetric ranges (e.g. 1 → 1.15)
 * are common for UI button breathing; symmetric is fine too.
 */
export type PulseAnimation = {
  kind: "pulse";
  /** Scale at the rest point. Typically 1. */
  from: number;
  /** Peak scale. >1 grows, <1 shrinks. */
  to: number;
  /** One full pulse period (rest → peak → rest) in ms. */
  durationMs: number;
  /** Iteration count: a positive integer or `"infinite"`. */
  repeat: number | "infinite";
};

/**
 * Sine-eased vertical bob — translate-Y oscillation in cell units.
 * Suitable for idle character bobs, floating menu items.
 */
export type BobAnimation = {
  kind: "bob";
  /** Vertical travel in cells. Oscillates between -amplitude and +amplitude. */
  amplitude: number;
  /** One full bob period in ms. */
  durationMs: number;
  /** Iteration count: a positive integer or `"infinite"`. */
  repeat: number | "infinite";
};

/**
 * Sine-eased opacity oscillation between `from` and `to`. For a periodic
 * fade-in/fade-out cycle. One-shot fades land with a future tween kind.
 */
export type FadeAnimation = {
  kind: "fade";
  /** Opacity at one extreme, 0..1. */
  from: number;
  /** Opacity at the other extreme, 0..1. */
  to: number;
  /** One full fade period (from → to → from) in ms. */
  durationMs: number;
  /** Iteration count: a positive integer or `"infinite"`. */
  repeat: number | "infinite";
};

/**
 * Continuous linear translation at a constant velocity (cells per second).
 *
 * Drift has no `repeat` — linear translation has no natural iteration
 * boundary, unlike rotation (full revolution) or oscillation (one cycle).
 * For a one-shot bounded translation, a future tween kind is the right
 * fit.
 */
export type DriftAnimation = {
  kind: "drift";
  /** Velocity in cells per second. Direction is encoded in the vector. */
  velocity: { x: number; y: number };
};
