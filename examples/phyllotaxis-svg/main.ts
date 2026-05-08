import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { installCursorField } from "../windows-svg/cursor-field.ts";
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

installCursorField(controller, scene, {
  radius: 80,
  maxDisplacement: 6,
  falloff: "smooth",
});

(globalThis as { __tessera?: unknown }).__tessera = controller;
