# AGENTS.md — `examples/windows-svg/`

Win98-style desktop scene composed from L1 cell helpers (`rect`, `grid`,
`outline`, `gradient`) and L2 component fragments (`composeScene`), with
cursor-driven voxel repulsion via L4 `onFrame`. The scene is fully
dynamic-resolution: `buildWindowsScene(dims?)` adapts to any viewport.

## Index

### Files here

| File | Purpose |
|---|---|
| `theme.ts` | Win98 palette + layout constants (`TITLEBAR_HEIGHT`, `START_BUTTON_W`, `TRAY_W`, `TITLE_SCALE`, `TASKBAR_TEXT_SCALE`). |
| `components.ts` | Pure component functions returning `SceneFragment` — `desktopBackground`, `taskbar`, `windowChrome`, `desktopIcon`. All accept `dims?: LayerDims`. |
| `components.test.ts` | Layout invariant tests — asserts every text placement fits its container at the configured scale. Run with `bun test`. |
| `scene.ts` | `buildWindowsScene(dims?)` builder + static `windowsScene` export for gallery compat. |
| `cursor-field.ts` | `installCursorField` — registers an `onFrame` callback that repels every entity from the cursor. |
| `main.ts` | Browser entry — computes dims from container, builds scene, installs cursor field. |
| `index.html` | Static page. Teal (`#008080`) page background. |
| `dev.ts` | `Bun.serve` dev server on port 3007. Run via `bun run dev:windows`. |
| `build.ts` | Static build → `dist/windows/`. Run via `bun run build:windows`. |

## Rules

- **Imports from `../../src/index.ts` only.** No reaching into `src/core/`.
- **One layer.** Everything contributes to the layer named `"ui"`. The
  first fragment (`desktopBackground`) establishes `cellSize/width/height`
  — all other fragments just contribute entities (first-wins per ADR 0023).
  Default dims: `cellSize: 4`, `width: 200`, `height: 120`; `main.ts`
  overrides with viewport-derived values.
- **No declared animations.** Motion comes from the cursor field's
  `onFrame` callback via `setOffset`. Any `Animation` on a scene entity
  is a regression.
- **Cursor-reactive components decompose into single-cell entities.**
  `taskbar`, `windowChrome`, and `desktopIcon` use `grid()` (not `rect()`)
  for their bodies and wrap each cell in its own `Entity` so the cursor
  field can address cells individually. The desktop background is the
  one exception — it's a single big `rect()`.
- **Stable id convention:** `${idPrefix}.${role}.${index}`. Every
  component takes `idPrefix` from the caller so two windows can coexist
  without entity-id collisions.

## How to verify locally

```bash
bun run dev:windows
# open http://localhost:3007
# expected:
#   - teal desktop fills full viewport (no letterbox/clipping)
#   - three icons stacked top-left: MY PC, RECYCLE, NOTEPAD
#   - two overlapping windows with blue gradient title bars — titles fit
#   - START button label fits inside button; clock fits in tray
#   - moving the cursor: every nearby voxel flies outward (smoothstep)

bun test examples/windows-svg/components.test.ts
# 9 layout invariant tests — all must pass
```

Type-check:

```bash
bun run typecheck
```

## Layout invariants (enforced by `components.test.ts`)

Every text placement has a container. The test file asserts:

| Text | Scale | Container |
|---|---|---|
| START label | `TASKBAR_TEXT_SCALE` (0.5) | button face minus flag offset |
| Clock "10:24 AM" | `TASKBAR_TEXT_SCALE` (0.5) | tray face |
| Window title | `TITLE_SCALE` (0.6) | `titleBarH = TITLEBAR_HEIGHT - 2` cells |

If you change any scale or dimension constant, run the tests first.

## What's intentionally missing

- **Working buttons / interactive close.** The close button is purely
  visual — entity-level click handling is not yet a primitive.
- **Sunken-bevel inputs.** Only the raised bevel is implemented. Sunken
  input boxes (text fields, list views) invert highlight/shadow — not
  needed for v1.
- **Diagonal title-bar gradient.** ADR 0022 ships horizontal/vertical
  only; horizontal is good-enough Win98 silhouette.
- **Resize handling.** `main.ts` computes dims once at mount. Viewport
  resize does not rebuild the scene.

---

<!-- last-reviewed: a0bb836 -->
