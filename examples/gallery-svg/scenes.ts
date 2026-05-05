/**
 * Scene registry for the gallery hub.
 *
 * Each entry pulls a fully-composed `Scene` from a sibling example.
 * The gallery imports this map and lets the user cycle through them via
 * `controller.setScene(...)`.
 *
 * If you add a new example, add it here too — the gallery will pick it
 * up automatically. Order in this array is the cycle order.
 */

import type { Scene } from "../../src/index.ts";

import { coffeeShopScene } from "../mug-svg/scene.ts";
import { menuScene } from "../menu-svg/scene.ts";
import { inventoryScene } from "../inventory-svg/scene.ts";
import { landingScene } from "../landing-svg/scene.ts";
import { rhythmScene } from "../rhythm-svg/scene.ts";

export type GalleryEntry = {
  /** Stable id, used in the URL hash for deep-linking. */
  id: string;
  /** Human-readable label for the nav strip. */
  label: string;
  /** One-line summary of what the demo demonstrates. */
  blurb: string;
  /** Animation kinds visibly exercised by this scene. */
  kinds: string[];
  scene: Scene;
};

export const galleryScenes: GalleryEntry[] = [
  {
    id: "mug",
    label: "Mug",
    blurb: "MotionPitch coffee mug — the v0.1 regression port.",
    kinds: ["oscillate", "spin"],
    scene: coffeeShopScene,
  },
  {
    id: "menu",
    label: "Title Menu",
    blurb: "Stylized title-screen scene; the leaf-kind starter.",
    kinds: ["pulse", "bob", "fade", "drift"],
    scene: menuScene,
  },
  {
    id: "inventory",
    label: "Inventory",
    blurb: "JRPG status screen — portrait, equipment grid, dialogue.",
    kinds: ["oscillate", "pulse", "bob", "fade", "drift"],
    scene: inventoryScene,
  },
  {
    id: "landing",
    label: "Landing",
    blurb: "Voxel-cell take on a marketing homepage.",
    kinds: ["oscillate", "pulse", "bob", "fade", "drift"],
    scene: landingScene,
  },
  {
    id: "rhythm",
    label: "Rhythm HUD",
    blurb: "Densest demo — every Animation kind in one frame.",
    kinds: ["oscillate", "spin", "pulse", "bob", "fade", "drift"],
    scene: rhythmScene,
  },
];
