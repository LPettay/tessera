import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { windowsScene } from "./scene.ts";
import { installCursorField } from "./cursor-field.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera windows-svg: missing #scene container");
}

const inner = svgRenderer.mount(container, windowsScene);
const controller = withPageCitizenship(inner, container);

const svg = container.querySelector("svg");
if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

// Cursor repulsion field — every voxel within ~30 viewBox units of the
// cursor flies outward, scaled by smoothstep falloff. The displacement
// composes additively on top of any declared Animation (none in this
// scene), demonstrating that the framework's atom is reactive — every
// pixel of the UI dissolves under the mouse.
installCursorField(controller, windowsScene, {
  radius: 60,
  maxDisplacement: 4,
  falloff: "smooth",
});

(globalThis as { __tessera?: unknown }).__tessera = controller;
