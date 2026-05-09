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

import type { RendererController, Scene } from "../../src/index.ts";

import { coffeeShopScene } from "../mug-svg/scene.ts";
import { menuScene } from "../menu-svg/scene.ts";
import { inventoryScene } from "../inventory-svg/scene.ts";
import { landingScene } from "../landing-svg/scene.ts";
import { rhythmScene } from "../rhythm-svg/scene.ts";
import { breakapartScene } from "../breakapart-svg/scene.ts";
import { windowsScene } from "../windows-svg/scene.ts";
import { buildPhyllotaxisScene } from "../phyllotaxis-svg/scene.ts";
import { installCursorField } from "../windows-svg/cursor-field.ts";

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
  /**
   * Optional setup hook — called after `controller.setScene(entry.scene)`
   * each time this entry becomes active. Returns a teardown function that
   * the gallery invokes before switching to the next entry.
   *
   * Use for `onFrame` callbacks, external listeners, anything imperative
   * that needs to live alongside the declared Scene. The Scene object
   * itself stays pure data.
   */
  setup?: (controller: RendererController, scene: Scene) => () => void;
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
  {
    id: "breakapart",
    label: "Breakapart",
    blurb: "Per-cell tween: each glyph pixel is an independent entity.",
    kinds: ["tween"],
    scene: breakapartScene,
  },
  {
    id: "windows",
    label: "Windows",
    blurb:
      "Win98-style desktop where every voxel dissolves under the cursor — onFrame field demo.",
    kinds: ["onFrame"],
    scene: windowsScene,
    setup: (controller) =>
      installCursorField(controller, windowsScene, {
        radius: 60,
        maxDisplacement: 4,
        falloff: "smooth",
      }),
  },
  {
    id: "phyllotaxis",
    label: "Phyllotaxis",
    blurb:
      "Golden-angle spiral — the same pattern nature uses in sunflowers. Every dot placed by mathematics.",
    kinds: ["onFrame"],
    // Build at gallery's default 120×68 grid so the scene is pre-composed.
    scene: buildPhyllotaxisScene({ width: 120, height: 68 }),
    setup: (controller, scene) =>
      installCursorField(controller, scene, {
        radius: 80,
        maxDisplacement: 6,
        falloff: "smooth",
      }),
  },
];
