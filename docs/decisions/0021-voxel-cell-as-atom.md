# ADR 0021 — Tessera's atom is the 2D voxel-cell

**Status:** Accepted
**Date:** 2026-05-08

## Context

Six demos have shipped: mug, menu, inventory, landing, rhythm, breakapart. They cover six animation kinds, three `EntityShape` kinds, and the page-citizenship layer. The breakapart demo proved a fact about Tessera that wasn't yet stated as a principle: **every cell is individually addressable as a unit of composition**.

We're now planning a multi-layer Windows-replica demo with cursor-driven repulsion. The next phase introduces several new primitives: cell drawing helpers, scene fragments / component composition, layout helpers, an `onFrame` interactivity hook, and (later) a declarative `Field` system. Without an explicit anchor — *what is the unit these primitives operate on?* — every future ADR will re-litigate the framing.

This ADR names the anchor.

## Decision

**Tessera's atom is the 2D voxel-cell.**

A voxel-cell is:

- A discrete unit on a 2D grid — a square, not a cube, not a polygon, not a sprite.
- Has **position** (cell-space coordinates, fractional permitted), **size** (per-layer `cellSize` projects to pixels), **fill** (one solid colour), and **identity** (addressable individually via `Entity`).
- Composes via the existing primitives: `Cell` (sparse layer-grid entries), `Entity.shape.cells` (`voxel-sprite`), and `VoxelSpriteCell` (the rect that ends up in the renderer).
- Renders identically across every tier (SVG today, Canvas2D and WebGL2 to come) within each tier's capability ceiling.

Every primitive Tessera adds — drawing helpers, components, layouts, animations, fields, particles — operates on this atom. Every higher-level abstraction is a different lens on the same unit.

## 2D scope

**Tessera operates on 2D voxel-cells. The framework does not provide a 3D rendering path.**

- The `axis: "x" | "y" | "z"` fields on `OscillateAnimation` and `SpinAnimation` are **renderer-tier faux-3D affordances** (the SVG renderer uses CSS `rotate3d` for parallax depth on `oscillate.axis = "y"`). They do not make Tessera a 3D engine and userland should not treat the z-axis as semantically meaningful beyond the SVG tier's faux effects.
- Depth, perspective, true Z-translation, mesh primitives, and lighting are out of scope.
- If a 3D primitive ever becomes warranted, it lands as a **separate primitive** — not a generalisation of the voxel-cell. The cell stays 2D.

## The abstraction stack

Once the atom is named, every higher-level primitive snaps into a layer above it:

| Layer | Operates on the atom by | Examples |
|---|---|---|
| **L0** — atom | being it | `VoxelSpriteCell`, `Cell`, `Entity` |
| **L1** — drawing | emitting cells | `rect()`, `outline()`, `border()`, `gradient()` |
| **L2** — fragments | grouping cells | components return `{ cells?, entities?, layers? }` |
| **L3** — layout | arranging fragments | `hstack()`, `vstack()`, `grid()` |
| **L4** — behaviour | animating cells | `Animation` kinds, `Field` kinds, `onFrame` hooks |
| **L5** — composition | composing components | `window()`, `taskbar()`, `icon()`, full UIs |

The atom never changes. Each layer is a different unit-of-thought operating on it. Future ADRs (0022 cell drawing helpers, 0023 scene fragments, 0024 `onFrame`, 0025 `Field`, …) describe specific layers in this stack and reference back to it for vocabulary.

## Renderer obligations

Every renderer tier MUST honour the 2D voxel-cell as the atom:

- The Scene → cells/entities mapping is invariant across tiers.
- A Scene authored against the SVG tier renders equivalently against Canvas2D and WebGL2 within each tier's `RendererCapabilities`.
- Pixel mapping is a per-tier rendering concern, not a scene-description concern. SVG renders cells as `<rect>`; Canvas2D fills rects; WebGL2 emits instanced quads. The cell is the same cell.

This is what makes "the same Scene runs through every tier" a real claim and not a marketing line.

## Niche / positioning

What does this make Tessera, vs prior art?

| Library | Atom |
|---|---|
| Three.js, Babylon.js | 3D mesh / geometry |
| Pixi.js | 2D sprite |
| Phaser | 2D game object |
| sprite-stack experiments, react-pixel-art | technique demos, not frameworks |
| **Tessera** | **2D voxel-cell** — discrete-grid pixel-art-as-primitive |

No existing framework treats the discrete 2D cell as the atomic unit of composition for web UIs and game scenes alike. That's the niche. The README's tagline updates accordingly when the next phase ships: **"the 2D voxel-cell is the atom of your UI."**

## Alternatives considered

**The pixel as atom.** Rejected. Pixels are renderer-implementation-specific (browser zoom, DPR, GPU subpixel) and too granular for composition. Treating pixels as atomic conflates rendering with description.

**The entity as atom.** Rejected. Entities are groupings of cells with identity and animation. Useful, but not the smallest unit. The breakapart demo decomposes a `text` entity into ~90 single-cell entities — proof that the entity is a grouping above the atom, not the atom itself.

**The voxel as 3D.** Rejected. Tessera is 2D. We reclaim "voxel" for 2D — the etymology mismatch (voxel = volumetric pixel) is acceptable because the term is already established in the codebase (`voxel-sprite` shape, `VoxelSpriteCell`, the `mug-svg` "voxel" demo) and accurately conveys "discrete-grid cellular unit" in casual usage.

**No anchor; let the framing emerge.** Rejected. We've shipped 20 ADRs and the framing has been implicit. Naming it now prevents future ADRs from inventing parallel mental models for the same thing.

## Consequences

- **Future ADRs reference back to this stack.** "0022 — cell drawing helpers (L1)" is shorter and clearer than re-establishing the framing each time.
- **Naming pressure on every new primitive.** Anything that doesn't fit the L0–L5 stack is a signal: either the primitive is wrong, or the stack needs an explicit extension. Either way, decision is forced.
- **Renderer tiers gain a hard contract.** Honouring the atom across tiers becomes a checkable design property, not a vibe.
- **The README's pitch tightens.** "TypeScript framework for layered 2D voxel scenes" → "the 2D voxel-cell is the atom of your UI." Lands with the next-phase PR.
- **3D requests get a clear answer:** out of scope, and not "for now" — by design.

## What this doesn't decide

- Specific cell drawing helpers (deferred to 0022)
- Scene fragments / component composition (0023)
- The `onFrame` hook (0024)
- The declarative `Field` system (0025)
- Layout helpers (TBD)
- Theme tokens (TBD)
- Canvas2D and WebGL2 tier implementations (their own ADRs)
- Particle systems (Tier 3 / WebGPU concerns, far future)

These ADRs all live above this one in the abstraction stack. They cite this ADR for vocabulary; this ADR does not pre-commit to their shapes.
