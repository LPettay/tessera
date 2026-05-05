import { svgRenderer, withPageCitizenship } from "../../src/index.ts";
import { galleryScenes } from "./scenes.ts";

function requireEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`Tessera gallery: missing #${id} element`);
  }
  return el;
}

const container = requireEl("scene");
const navStrip = requireEl("gallery-nav");
const blurb = requireEl("gallery-blurb");
const kindsEl = requireEl("gallery-kinds");

// --- Initial scene from URL hash, or first in the registry ------------ //
function entryFromHash(): number {
  const hash = window.location.hash.replace(/^#/, "");
  const idx = galleryScenes.findIndex((e) => e.id === hash);
  return idx >= 0 ? idx : 0;
}

let activeIndex = entryFromHash();
const initial = galleryScenes[activeIndex]!;

const inner = svgRenderer.mount(container, initial.scene);
const controller = withPageCitizenship(inner, container);

// Make the SVG fill the viewport, cropping rather than letterboxing.
const svg = container.querySelector("svg");
if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

(globalThis as { __tessera?: unknown }).__tessera = controller;

// --- Build the nav strip ---------------------------------------------- //

const navButtons: HTMLButtonElement[] = galleryScenes.map((entry, i) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "gallery-btn";
  btn.dataset.id = entry.id;
  btn.textContent = `${i + 1}. ${entry.label}`;
  btn.addEventListener("click", () => activate(i));
  navStrip.appendChild(btn);
  return btn;
});

function applyChrome(idx: number): void {
  const entry = galleryScenes[idx]!;
  navButtons.forEach((b, i) => {
    b.classList.toggle("active", i === idx);
  });
  blurb.textContent = entry.blurb;
  kindsEl.textContent = entry.kinds.join(" · ");
  document.title = `Tessera — ${entry.label}`;
  if (window.location.hash !== `#${entry.id}`) {
    history.replaceState(null, "", `#${entry.id}`);
  }
}

function activate(idx: number): void {
  if (idx === activeIndex) return;
  const entry = galleryScenes[idx];
  if (!entry) return;
  activeIndex = idx;
  // setScene rebuilds the SVG contents and restarts the animation loop.
  // The renderer reads layer dimensions from the new Scene, so demos with
  // different cell grids (e.g. rhythm-svg's 120×60) re-fit automatically.
  controller.setScene(entry.scene);
  // setScene replaces the inner <svg>; reapply the crop attribute.
  const next = container.querySelector("svg");
  if (next) next.setAttribute("preserveAspectRatio", "xMidYMid slice");
  applyChrome(idx);
}

applyChrome(activeIndex);

// --- Keyboard cycling ------------------------------------------------- //

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    activate((activeIndex + 1) % galleryScenes.length);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    activate((activeIndex - 1 + galleryScenes.length) % galleryScenes.length);
  } else if (e.key >= "1" && e.key <= "9") {
    const i = Number(e.key) - 1;
    if (i < galleryScenes.length) {
      e.preventDefault();
      activate(i);
    }
  }
});

window.addEventListener("hashchange", () => {
  const next = entryFromHash();
  if (next !== activeIndex) activate(next);
});
