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
 * The visual representation of an entity.
 *
 * v0.1 supports `voxel-sprite` (a small cell-grid that IS the entity — the
 * MotionPitch coffee mug uses this shape). More shapes land later: raster
 * sprites (post-v0.1), vector paths, sprite-stack slabs (v0.3).
 */
export type EntityShape = {
  kind: "voxel-sprite";
  /** Cells of the sprite, in entity-local cell coordinates (origin top-left). */
  cells: VoxelSpriteCell[];
  /**
   * Center of rotation/anchor in entity-local cell coordinates.
   * When omitted, defaults to the centroid of `cells`.
   */
  pivot?: { x: number; y: number };
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
 * Declarative animation applied to an entity.
 *
 * v0.1 supports only `oscillate` — the MotionPitch mug Y-rotation pattern.
 * Other animation kinds (translate, fade, sequence, keyframes) land in
 * later milestones.
 */
export type Animation = {
  kind: "oscillate";
  /**
   * Rotation axis. v0.1 visually supports only "y" (faux-3D Y-rotation, the
   * mug case); "x" and "z" are reserved in the type but renderers may not
   * implement them yet.
   */
  axis: "x" | "y" | "z";
  /** Amplitude in degrees. The animation oscillates between -degrees and +degrees. */
  degrees: number;
  /** One full oscillation period in milliseconds. */
  durationMs: number;
  /** Iteration count: a positive integer or "infinite". */
  repeat: number | "infinite";
};
