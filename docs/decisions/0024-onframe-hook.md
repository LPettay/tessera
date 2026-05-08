# ADR 0024 — `onFrame` interactivity hook (L4)

**Status:** Accepted
**Date:** 2026-05-08

## Context

ADR 0021 names L4 as "behaviour — `Animation` kinds, `Field` kinds, `onFrame` hooks." Today the framework's only behaviour primitive is the declarative `Animation` family (`oscillate`, `spin`, `pulse`, `bob`, `fade`, `drift`, `tween`). All seven kinds are static functions of `(elapsed, params)` — they cannot read the cursor, react to the scene's other entities, or respond to anything outside the entity's own clock.

The next demo target is a Windows-replica UI where every voxel near the cursor is repelled outward. That requires a per-frame, per-entity computation that:

- Reads cursor position
- Computes a displacement per entity based on cursor distance
- Composes additively with any declared `Animation` already active
- Doesn't require the scene description to change at runtime

The cleanest framework-level shape is an **escape-hatch hook**: userland registers a callback that fires every frame, with read access to the cursor and write access to per-entity translation offsets. This unblocks the cursor-repulsion demo immediately. A declarative `Field` system can be designed afterward (ADR 0025) once we've seen what the imperative pattern actually looks like in practice.

## Decision

`RendererController` gains two new methods and two new types ship in `src/core/renderer.ts`:

```ts
type FrameCallback = (ctx: FrameContext) => void;

type FrameContext = {
  elapsed: number;                                          // ms since scene start
  dt: number;                                               // ms since previous frame
  cursor: { x: number; y: number } | null;                  // viewBox space
  setOffset(layerId: string, entityId: string, dx: number, dy: number): void;
};

interface RendererController {
  // ... existing members
  onFrame(callback: FrameCallback): () => void;             // returns cancel fn
  setCursor(cursor: { x: number; y: number } | null): void; // explicit drive
}
```

Both methods are also passed through by `withPageCitizenship`.

### Three-phase tick

The SVG renderer's RAF tick now runs three phases per frame:

1. **Run callbacks** — populate `currentOffsets` via `setOffset`.
2. **Apply animations** — each animated entity rewrites its own transform from `baseTransform + animation` (existing logic, untouched).
3. **Apply offsets** — append a `translate(dx*cellSize, dy*cellSize)` to each entity that has an offset this frame; reset transforms for static entities that had an offset last frame but not this one.

This three-phase split is what makes offsets **additive** with declared animations: the animation step writes the base+anim transform, the offset step appends. An entity with a `tween` animation AND a cursor-repulsion offset gets both.

### Reset-every-frame semantics

`setOffset` writes to a per-frame map that's cleared at the start of each tick. Userland MUST call `setOffset` every frame for any entity it wants displaced. There is no "set once and forget" — it would conflate two reasonable models (`setOffset` as direct manipulation vs. as a declarative override) and force the framework to track the user's intent across frames.

The reset model also means: a callback that stops calling `setOffset` for an entity returns it to its declared transform on the next frame. No cleanup API, no stale state.

### Cursor coordinate space

`cursor.x` and `cursor.y` are in renderer **viewBox coordinates** — the same units as `cellSize × cell` for any layer with that `cellSize`. To convert to a specific layer's cell space, divide by that layer's `cellSize`.

The renderer attaches `pointermove` and `pointerleave` listeners on the SVG element and uses `getScreenCTM().inverse()` to translate `clientX/Y` into viewBox space. This handles `preserveAspectRatio`, CSS scaling, and aspect-ratio cropping correctly without us hand-rolling the math.

`setCursor` is the explicit-drive escape hatch — useful for headless tests, programmatic input, or projecting a synthetic cursor (touch gesture, AI agent, gamepad). A subsequent native `pointermove` overwrites the override; the two coexist by last-write-wins.

### Loop dormancy

Previously the RAF loop went dormant when every animation completed its `repeat` count. With `onFrame`, it must keep running while at least one callback is registered (a static scene with cursor reactivity has zero animated entities but still needs to tick). The check becomes `anyAlive || frameCallbacks.length > 0`.

## Alternatives considered

**Declarative `Field` kind in scene data.** Rejected for now (will land as ADR 0025). Designing the right shape — falloff curves, strength units, composition rules between multiple fields — is easier with a working imperative reference. Ship the hook, build the demo, see the pattern, then formalise.

**Per-frame "uniforms" map** (`controller.uniforms.cursor = ...`) and entities declaratively reference uniforms in their animation params. Rejected. Two layers of indirection (uniforms + declarative bindings) for the same imperative power.

**Wrap each entity in two `<g>` elements** — outer for offset, inner for animation — so transforms compose via DOM nesting instead of string concatenation. Rejected. Doubles the SVG node count and loses no expressiveness; CSS transform string composition handles this fine.

**`controller.observe(entityId).onFrame(...)`** — per-entity callbacks instead of one global. Rejected. Most cursor-style fields are O(scene): the callback walks every entity each frame anyway. Per-entity callbacks would multiply the call surface for no gain and complicate coordination across entities (a magnetic field that needs to know about other magnets).

**Cursor in cell-space of some "primary" layer** instead of viewBox space. Rejected. There is no primary layer — multi-density scenes (Windows UI) have several `cellSize`s coexisting. ViewBox space is the one coordinate system every layer can convert to with a divide.

## Consequences

- **Public API gains 4 surface areas:** `controller.onFrame`, `controller.setCursor`, type `FrameCallback`, type `FrameContext`. All listed in `docs/api-surface.txt`.
- **`RendererController` interface changes are mandatory for every renderer tier.** Canvas2D and WebGL2 implementations (when they ship) must also implement `onFrame` and `setCursor` with the same semantics. The hook is renderer-agnostic by design.
- **Existing demos are unaffected.** None call `onFrame`, so the offset-application path is a no-op for them. Smoke-tested on `breakapart-svg` to confirm.
- **`page-citizenship.ts` passes through both methods** unchanged. Pause / reduced-motion still halts the RAF loop, which means callbacks pause too (correct behaviour — an offscreen scene shouldn't burn CPU on cursor math).
- **A declarative `Field` ADR is now unblocked.** Once a Windows-replica demo exists using `onFrame` for cursor repulsion, ADR 0025 can codify the patterns it needed (radial falloff, magnitude clamping, etc.) into a scene-level primitive.

## What this doesn't decide

- Declarative `Field` system (ADR 0025, after demo)
- Multi-touch / gesture support (TBD; today `setCursor` is single-point)
- Pointer down/up/click event surface (TBD; today only position is tracked)
- Frame-budget hints — which callback to skip when the renderer is over budget (TBD; not needed for v0.1 scenes)
- Pointer capture / hit-testing against entities (TBD; userland computes against entity positions today)
