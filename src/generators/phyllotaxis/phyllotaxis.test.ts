/**
 * Invariant tests for the phyllotaxis generator.
 *
 * Each `describe` block maps to one invariant documented in AGENTS.md.
 * A failing test means an invariant has been violated — fix the generator,
 * not the test, unless the invariant itself has been intentionally relaxed
 * (in which case update AGENTS.md alongside the test).
 */

import { describe, expect, it } from "bun:test";
import type { GeneratorGeometry } from "../../index.ts";
import { phyllotaxisGenerator, type PhyllotaxisConfig } from "./index.ts";

// ---- helpers ------------------------------------------------------------- //

const DEFAULT_GEOMETRY: GeneratorGeometry = { width: 64, height: 48, cellSize: 1 };

function baseConfig(overrides: Partial<PhyllotaxisConfig> = {}): PhyllotaxisConfig {
  return {
    count: 200,
    dotScale: 2,
    background: "#000000",
    palette: { inner: "#ff0000", outer: "#0000ff" },
    ...overrides,
  };
}

/** Channel-wise distance between two `#rrggbb` strings. */
function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.max(Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb));
}

// ---- invariant 1: no dot outside layer bounds --------------------------- //

describe("phyllotaxis / bounds", () => {
  it("every entity position is inside [0,width) x [0,height) at modest count", () => {
    const geometry = DEFAULT_GEOMETRY;
    const out = phyllotaxisGenerator(baseConfig({ count: 200 }), geometry);
    for (const e of out.entities) {
      expect(e.position.x).toBeGreaterThanOrEqual(0);
      expect(e.position.x).toBeLessThan(geometry.width);
      expect(e.position.y).toBeGreaterThanOrEqual(0);
      expect(e.position.y).toBeLessThan(geometry.height);
    }
  });

  it("drops out-of-bounds dots when count overflows the layer", () => {
    // With dotScale 4 and count 2000 the spiral extends well past a 32x24 layer.
    const geometry: GeneratorGeometry = { width: 32, height: 24, cellSize: 1 };
    const out = phyllotaxisGenerator(
      baseConfig({ count: 2000, dotScale: 4 }),
      geometry,
    );
    expect(out.entities.length).toBeLessThan(2000);
    for (const e of out.entities) {
      expect(e.position.x).toBeGreaterThanOrEqual(0);
      expect(e.position.x).toBeLessThan(geometry.width);
      expect(e.position.y).toBeGreaterThanOrEqual(0);
      expect(e.position.y).toBeLessThan(geometry.height);
    }
  });
});

// ---- invariant 2: background covers every cell exactly once ------------- //

describe("phyllotaxis / background fill", () => {
  it("emits width * height background cells", () => {
    const geometry: GeneratorGeometry = { width: 17, height: 11, cellSize: 1 };
    const out = phyllotaxisGenerator(baseConfig(), geometry);
    expect(out.cells.length).toBe(geometry.width * geometry.height);
  });

  it("covers every (x,y) coordinate exactly once with the configured fill", () => {
    const geometry: GeneratorGeometry = { width: 8, height: 6, cellSize: 1 };
    const config = baseConfig({ background: "#123456" });
    const out = phyllotaxisGenerator(config, geometry);

    const seen = new Set<string>();
    for (const cell of out.cells) {
      const key = `${cell.x},${cell.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(cell.fill).toBe(config.background);
    }
    expect(seen.size).toBe(geometry.width * geometry.height);
  });
});

// ---- invariant 3: entity id uniqueness ---------------------------------- //

describe("phyllotaxis / entity ids", () => {
  it("every entity id is unique and matches phyllotaxis.dot.{n}", () => {
    const out = phyllotaxisGenerator(baseConfig({ count: 300 }), DEFAULT_GEOMETRY);
    const ids = new Set<string>();
    for (const e of out.entities) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.id).toMatch(/^phyllotaxis\.dot\.\d+$/);
      const n = Number(e.id.slice("phyllotaxis.dot.".length));
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(300);
    }
    expect(ids.size).toBe(out.entities.length);
  });
});

// ---- invariant 4: color interpolation endpoints ------------------------- //

describe("phyllotaxis / color interpolation", () => {
  // A large enough layer that n=0 and n=count-1 both stay in bounds.
  const geometry: GeneratorGeometry = { width: 200, height: 200, cellSize: 1 };
  const config = baseConfig({
    count: 50,
    dotScale: 1.5,
    palette: { inner: "#ff0000", outer: "#0000ff" },
  });

  function fillOf(id: string, entities: { id: string; shape: { cells: { fill: string }[] } }[]): string {
    const e = entities.find((x) => x.id === id);
    if (!e) throw new Error(`expected entity ${id} in output`);
    return e.shape.cells[0]!.fill;
  }

  it("n=0 fill equals palette.inner", () => {
    const out = phyllotaxisGenerator(config, geometry);
    // Cast — we know our shapes are voxel-sprite single-cell.
    const fill = fillOf("phyllotaxis.dot.0", out.entities as never);
    expect(colorDistance(fill, config.palette.inner)).toBeLessThanOrEqual(1);
  });

  it("n=count-1 fill equals palette.outer", () => {
    const out = phyllotaxisGenerator(config, geometry);
    const fill = fillOf(`phyllotaxis.dot.${config.count - 1}`, out.entities as never);
    expect(colorDistance(fill, config.palette.outer)).toBeLessThanOrEqual(1);
  });
});

// ---- invariant 5: count = 0 ---------------------------------------------- //

describe("phyllotaxis / count = 0", () => {
  it("returns no entities, full background, and does not crash", () => {
    const geometry: GeneratorGeometry = { width: 10, height: 7, cellSize: 1 };
    const out = phyllotaxisGenerator(baseConfig({ count: 0 }), geometry);
    expect(out.entities).toEqual([]);
    expect(out.cells.length).toBe(geometry.width * geometry.height);
  });
});

// ---- invariant 6: count = 1 (no division by zero) ----------------------- //

describe("phyllotaxis / count = 1", () => {
  it("produces a finite, in-bounds entity with a valid color (no NaN)", () => {
    const geometry: GeneratorGeometry = { width: 32, height: 32, cellSize: 1 };
    const out = phyllotaxisGenerator(baseConfig({ count: 1 }), geometry);
    expect(out.entities.length).toBe(1);
    const e = out.entities[0]!;
    expect(Number.isFinite(e.position.x)).toBe(true);
    expect(Number.isFinite(e.position.y)).toBe(true);
    expect(e.position.x).toBeGreaterThanOrEqual(0);
    expect(e.position.x).toBeLessThan(geometry.width);
    expect(e.position.y).toBeGreaterThanOrEqual(0);
    expect(e.position.y).toBeLessThan(geometry.height);
    // The shape's single cell must have a parseable hex fill — the
    // `|| 1` guard in the generator prevents NaN from a 0/0 division.
    const cell = (e.shape as { cells: { fill: string }[] }).cells[0]!;
    expect(cell.fill).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
