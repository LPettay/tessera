import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { coffeeShopScene } from "./scene.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera coffee-shop example: missing #scene container");
}

const inner = svgRenderer.mount(container, coffeeShopScene);
const controller = withPageCitizenship(inner, container);

// Make the SVG fill the viewport, cropping rather than letterboxing.
// The renderer doesn't set this by default — the example overrides for
// its own full-bleed layout.
const svg = container.querySelector("svg");
if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

// Surface the controller for ad-hoc inspection from devtools.
// Not part of the public API — only used by the example harness.
(globalThis as { __tessera?: unknown }).__tessera = controller;
