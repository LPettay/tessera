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
 * A single drawable segment within a `vector` shape. Tagged union — currently
 * only line segments are supported; future variants might include filled
 * polygons, arcs, or quadratic curves.
 *
 * Coordinates are in entity-local cell units (fractional allowed). The
 * renderer rasterizes the segment to axis-aligned cells, walking from `from`
 * to `to` and stamping a band `thickness` cells wide perpendicular to the
 * line direction.
 */
export type VectorSegment = {
  kind: "line";
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Width of the rasterized band in cells. Must be ≥ 1. */
  thickness: number;
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
 * v0.1 ships two kinds:
 *  - `oscillate` — sine-eased back-and-forth rotation (the MotionPitch
 *    mug Y-rotation pattern).
 *  - `spin` — continuous rotation at a constant rate (suitable for
 *    background elements like a slowly-rotating sunburst).
 *
 * More kinds (translate, fade, keyframes, sequences) land in later
 * milestones. Adding a new kind is an additive, non-breaking change at
 * the type level — but exhaustive consumer code must add a branch.
 */
export type Animation = OscillateAnimation | SpinAnimation;

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
