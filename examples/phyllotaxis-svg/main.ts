import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { installIdleField } from "./idle-field.ts";
import { buildPhyllotaxisScene, CELL_SIZE } from "./scene.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera phyllotaxis-svg: missing #scene container");
}

const rawW = container.clientWidth;
const rawH = container.clientHeight;
const width = rawW > 0 ? Math.floor(rawW / CELL_SIZE) : 120;
const height = rawH > 0 ? Math.floor(rawH / CELL_SIZE) : 68;

const scene = buildPhyllotaxisScene({ width, height });
const inner = svgRenderer.mount(container, scene);
const controller = withPageCitizenship(inner, container);

// Idle breathing + cursor repulsion in one onFrame hook — `setOffset`
// REPLACES per-entity offsets each frame, so the two displacements are
// summed at the call site (see idle-field.ts for the full rationale).
installIdleField(controller, scene, {
  cursorRadius: 80,
  cursorMaxDisplacement: 6,
  cursorFalloff: "smooth",
});

(globalThis as { __tessera?: unknown }).__tessera = controller;
