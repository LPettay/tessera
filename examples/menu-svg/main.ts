import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { menuScene } from "./scene.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera menu-svg example: missing #scene container");
}

const inner = svgRenderer.mount(container, menuScene);
const controller = withPageCitizenship(inner, container);

const svg = container.querySelector("svg");
if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

(globalThis as { __tessera?: unknown }).__tessera = controller;
