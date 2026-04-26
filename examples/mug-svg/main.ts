import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { mugScene } from "./mug-scene.ts";

const container = document.getElementById("scene");
if (!(container instanceof HTMLElement)) {
  throw new Error("Tessera mug example: missing #scene container");
}

const inner = svgRenderer.mount(container, mugScene);
const controller = withPageCitizenship(inner, container);

// Surface the controller for ad-hoc inspection from devtools.
// Not part of the public API — only used by the example harness.
(globalThis as { __tessera?: unknown }).__tessera = controller;
