# AGENTS.md — `examples/gallery-svg/`

Gallery hub. One mount, swap scenes via `controller.setScene(...)`. Lands at the GH Pages root (`/`); per-demo bundles live at `/<name>/` (ADR 0017).

## Index

### Files here

| File | Purpose |
|---|---|
| `scenes.ts` | Registry — array of `{id, label, blurb, kinds, scene}`, one per demo. Add a new entry here when a new demo lands. |
| `main.ts` | Mounts the SVG renderer once, builds the nav strip, wires click + keyboard handlers, calls `controller.setScene` on switch. |
| `index.html` | Static page — full-bleed scene container, floating nav strip at top, brand + blurb + key hints in the corners. |
| `dev.ts` | `bun run dev:gallery` on port 3005. |
| `build.ts` | `bun run build:gallery` → `dist/` (root). Must run AFTER per-demo builds in `build:examples`. |

## Rules

- **Imports come from `../../src/index.ts` only** (for the renderer / page-citizenship surface).
- **Scene imports come from sibling `examples/<name>/scene.ts` files.** That's the registry's whole job — collecting `Scene` objects from each demo without bypassing the public API of the framework.
- **One Scene at a time.** `setScene` rebuilds the SVG; it doesn't keep the previous one alive.

## How to verify locally

```bash
bun run dev:gallery
# open http://localhost:3005
# expected:
#   - lands on the mug demo (or whichever id matches the URL #hash)
#   - top-center nav strip with one button per registered demo
#   - clicking a button swaps the scene immediately, no reload
#   - ←/→ cycle, 1–5 jump directly
#   - URL hash updates to match the active demo (#mug, #menu, ...)
```

## Why a registry, not a string-keyed map

The registry is an ordered array because cycle order matters and order isn't a property of object-literal maps in TS at the type level. If the count grows past ~10, generate `scenes.ts` from a directory walk instead of editing it by hand.

---

<!-- last-reviewed: 241652d -->
