import type { Scene } from "../../src/index.ts";
import { phyllotaxisGenerator } from "../../src/index.ts";

export const CELL_SIZE = 8;

export type Dims = { width: number; height: number };

export function buildPhyllotaxisScene(dims: Dims): Scene {
  const { width, height } = dims;

  const output = phyllotaxisGenerator(
    {
      count: Math.floor(width * height * 0.4),
      dotScale: 2.2,
      background: "#0a0a0f",
      palette: { inner: "#f0c040", outer: "#7c3aed" },
    },
    { width, height, cellSize: CELL_SIZE },
  );

  return {
    layers: [
      {
        id: "field",
        cellSize: CELL_SIZE,
        width,
        height,
        cells: output.cells,
        entities: output.entities,
        zIndex: 0,
        opacity: 1,
        visible: true,
      },
    ],
  };
}
