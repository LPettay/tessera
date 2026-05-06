# ADR 0017: Gallery hub + multi-example sub-path deploy layout

## Status

Accepted — 2026-05-05

## Context

ADR 0015 deployed a single example (mug-svg) directly at the GH Pages root, with the closing note: *"When v0.2.1+ adds more examples, restructure to a sub-path layout (`/tessera/mug-svg/`, …) with a small landing page at the root."*

That moment has arrived. The v0.2.x demo set is now five examples — `mug-svg`, `menu-svg`, `inventory-svg`, `landing-svg`, `rhythm-svg`. Without a hub, a visitor lands on the mug and has no idea the others exist.

Two related decisions need to be made:

1. **URL layout.** Five demos can't all live at `/`.
2. **Hub UX.** Either a static index page that links out to each demo, or a single-bundle gallery that mounts one renderer and cycles scenes via `controller.setScene()`.

## Decision

### URL layout

```
/             → gallery-svg (the hub; loads one renderer and cycles scenes)
/mug/         → mug-svg
/menu/        → menu-svg
/inventory/   → inventory-svg
/landing/     → landing-svg
/rhythm/      → rhythm-svg
```

Mug moves from `/` to `/mug/` so all per-demo URLs are symmetric. The previous root URL becomes the gallery.

### Hub shape: gallery, not static index

`gallery-svg` is a real Tessera example — one `svgRenderer.mount()` call, one `withPageCitizenship` wrapper, and a small DOM nav strip. Clicking a button (or pressing ←/→/1–5) calls `controller.setScene(scenes[name])`. This:

- **Exercises a public-API surface that no other example exercises** (`RendererController.setScene`). The hub becomes a regression test for it.
- **Produces a cheaper deploy** than five iframes — one bundle, one renderer instance, no nested document overhead.
- **Avoids URL churn during cycling** — the gallery URL stays `/`; deep-linking to a specific demo uses `/mug/`, `/menu/`, etc., which still exist as standalone pages.

Each demo continues to ship its own `dist/<name>/index.html`. The gallery imports each scene module directly so all five scenes share one bundle; the standalone pages stay around for direct linking and as per-demo regression bundles.

### Build wiring

- `examples/mug-svg/build.ts` writes to `dist/mug/` (was `dist/`).
- `examples/gallery-svg/build.ts` writes to `dist/`.
- `build:examples` runs the demos first, gallery last (so the gallery's `dist/index.html` doesn't get clobbered by a later demo build that targets root).

The `Bun.build` invocation pattern (target=browser, format=esm) and the `index.html` references via relative `./main.js` carry over unchanged — same dev/prod symmetry ADR 0015 established.

## Consequences

- **Pro:** Clear, conventional layout. Visitors land on the hub; per-demo URLs are direct-linkable.
- **Pro:** Gallery exercises `setScene` end-to-end. Today no other example tests scene-swap.
- **Pro:** Each demo remains independently buildable — no coupling beyond shared scene imports.
- **Con:** Mug's deploy URL changes (`/` → `/mug/`). External references will break. Acceptable: at the time of writing, no third party links to the mug URL; the README is the only consumer and updates in the same PR.
- **Con:** The gallery bundles all five scene modules, so its bundle is larger than any individual demo's. At current scene sizes (each `scene.ts` is ~150–400 lines of cell-coordinate data) the gallery bundle stays well under 100KB minified — fine for a static site, but watch this if scenes grow.
- **Con:** Two sources of truth for "which examples exist" — the package.json scripts and the gallery's scene registry. Tolerable today; if the count climbs past ~10 we'd want to generate the registry.

## Alternatives considered

- **Static landing page that links out via `<a>`.** Simplest possible hub; no JS, no shared bundle. Rejected because it doesn't exercise `setScene`, and a "click → full page reload" flow feels worse than instant scene swap for a demo gallery.
- **iframe-per-demo gallery.** Each demo loads in its own iframe; the hub just toggles which iframe is visible. Heavier than mounting once; loses the "one renderer, swappable scenes" demonstration that's the point.
- **Keep mug at `/` and put the gallery at `/gallery/`.** Less churn, but asymmetric — the most-prominent URL becomes the *least* representative of the framework. Rejected.
- **Defer the gallery; ship the demos at sub-paths only.** Plausible, but the visitor experience is "five orphan URLs with no entry point." The gallery is small enough to land in the same PR as the demos.
