# AGENTS.md — `examples/windows-svg/`

Win98-style desktop scene composed from L1 cell helpers (`rect`, `grid`,
`outline`, `gradient`) and L2 component fragments (`composeScene`). The
goal is a **recognizable Windows 98 silhouette** built from voxel cells —
the cursor-driven repulsion field is a separate agent's job and lands on
top of this scene without rewriting it.

## Index

### Files here

| File | Purpose |
|---|---|
| `theme.ts` | Win98 palette + dimension constants. Each token names the *role* (e.g. `CHROME_HIGHLIGHT`), not the raw color. |
| `components.ts` | Pure component functions returning `SceneFragment` — `desktopBackground`, `taskbar`, `windowChrome`, `desktopIcon`. |
| `scene.ts` | Top-level `windowsScene: Scene` composed via `composeScene(...)` from the components above. |
| `main.ts` | Browser entry — mounts `svgRenderer` on `#scene`, wraps with `withPageCitizenship`. |
| `index.html` | Static page. Teal (`#008080`) page background. |
| `dev.ts` | `Bun.serve` dev server on port 3007. Run via `bun run dev:windows`. |
| `build.ts` | Static build → `dist/windows/`. Run via `bun run build:windows`. |

## Rules

- **Imports from `../../src/index.ts` only.** No reaching into `src/core/`.
- **One layer.** Everything contributes to the layer named `"ui"` with
  `cellSize: 4`, `width: 200`, `height: 120`. The first fragment in
  `composeScene` (the desktop background) establishes layer config —
  later fragments only contribute entities.
- **No animations on this scene.** Motion comes from a future cursor
  field. Any `Animation` declared here is a regression.
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
#   - teal desktop background fills the viewport
#   - three icons stacked top-left: MY PC, RECYCLE, NOTEPAD
#   - two overlapping windows mid-screen with blue gradient title bars
#   - bottom taskbar with raised START button + clock in tray
#   - no motion (cursor field is a separate agent's task)
```

Type-check:

```bash
bun run typecheck
```

## What's intentionally missing

- **Cursor-driven repulsion.** Lands separately as an `onFrame` /
  `Field`-style integration. This scene is the static substrate.
- **Working buttons / interactive close.** The close button is purely
  visual — entity-level click handling is not yet a primitive.
- **Sunken-bevel inputs.** Only the raised bevel is implemented (taskbar
  + window frame + START button). Sunken input boxes (text fields, list
  views) would invert the highlight/shadow placement; not needed for v1.
- **Diagonal title-bar gradient.** ADR 0022 ships horizontal/vertical
  only; the demo accepts the horizontal title-bar gradient as
  good-enough Win98 silhouette.

---

<!-- last-reviewed: 71d2e2e -->
