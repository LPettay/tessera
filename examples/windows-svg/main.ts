import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { LAYER_DIMS, TASKBAR_HEIGHT } from "./theme.ts";
import { buildWindowsScene } from "./scene.ts";
import { installCursorField } from "./cursor-field.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera windows-svg: missing #scene container");
}

// Compute cell grid from the actual container so the viewBox matches and
// nothing clips.  Clamp to LAYER_DIMS defaults if the container reports 0
// (hidden, pre-layout, etc.).
const cellSize = LAYER_DIMS.cellSize;
const rawW = container.clientWidth;
const rawH = container.clientHeight;
const width = rawW > 0 ? Math.floor(rawW / cellSize) : LAYER_DIMS.width;
const height = rawH > 0 ? Math.floor(rawH / cellSize) : LAYER_DIMS.height;
const dims = { id: LAYER_DIMS.id, cellSize, width, height };

// Sanity: windows need at least 50 cells vertically to avoid the taskbar
// eating the whole scene.
if (height < TASKBAR_HEIGHT * 2) {
  console.warn(`Tessera windows-svg: container too short (${height} cells) — scene may look cramped`);
}

const scene = buildWindowsScene(dims);
const inner = svgRenderer.mount(container, scene);
const controller = withPageCitizenship(inner, container);

// Cursor repulsion field — every voxel within ~30 viewBox units of the
// cursor flies outward, scaled by smoothstep falloff.
installCursorField(controller, scene, {
  radius: 60,
  maxDisplacement: 4,
  falloff: "smooth",
});

(globalThis as { __tessera?: unknown }).__tessera = controller;
