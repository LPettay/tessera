# ADR 0015: Deploy the example demos to GitHub Pages via Actions workflow

## Status

Accepted — 2026-04-29

## Context

v0.2.0 ships a working voxel coffee-shop demo. Local dev (`bun run dev:mug`) is fine for the maintainer, but anyone evaluating the framework needs a URL they can click. The deploy target should:

- Be **free** (this is a pre-alpha OSS framework with no commercial backing)
- Be **native to GitHub** (no separate accounts, single auth, single Actions workflow)
- Survive **infrequent updates** (cron-like cost shouldn't accumulate)
- Be the **conventional choice** for OSS framework demos (Three.js, Pixi, Excalibur all do this)

GitHub Pages with the new "GitHub Actions" source meets all four. Vercel/Cloudflare/Netlify are stronger for SaaS apps with previews per PR; GH Pages is the right fit for a static demo.

## Decision

Deploy the contents of `dist/` to GitHub Pages on every push to `main`, via a workflow at `.github/workflows/pages.yml`.

### Build

A new `examples/mug-svg/build.ts` calls `Bun.build` with the same options as the dev server (target=browser, format=esm, minify=true) and writes `main.js` + a copy of `index.html` to `dist/`. Wired up as `bun run build:mug` and aggregated under `bun run build:examples`. `dist/` is gitignored.

`index.html` references the bundle via the relative path `./main.js` so the same file works in dev (served from `localhost:3000/`) and prod (served from `lpettay.github.io/tessera/`).

### Workflow

Two jobs:

1. **build** — checkout, install with `--frozen-lockfile`, run `bun run build:examples`, upload `dist/` as a Pages artifact via `actions/upload-pages-artifact@v3`.
2. **deploy** — depends on build, uses `actions/deploy-pages@v4`, lives in the `github-pages` environment so the URL appears in the workflow summary.

`concurrency.group: pages` with `cancel-in-progress: false` — only one deploy at a time, but in-flight runs finish (a half-killed deploy can leave Pages in an odd state).

### Pages source configuration

GitHub Pages needs `build_type=workflow` set on the repo (instead of the default `legacy` branch-based source). One-time setup:

```bash
gh api -X PUT /repos/LPettay/tessera/pages -f build_type=workflow
```

Documented as a comment at the top of the workflow file.

### Live URL

`https://lpettay.github.io/tessera/`

For now this is the mug-svg demo directly — `dist/index.html` *is* the demo's index. When v0.2.1+ adds more examples, restructure to a sub-path layout (`/tessera/mug-svg/`, `/tessera/halftone/`, etc.) with a small landing page at the root.

## Consequences

- **Pro:** Free, integrated, conventional. Zero new accounts or services.
- **Pro:** Pushing to `main` automatically refreshes the demo. No manual deploy step. Same trust model as the existing `hygiene` workflow — no new permissions to audit.
- **Pro:** `dist/` stays gitignored. Build artifacts don't pollute the source tree.
- **Pro:** The `Bun.build` invocation is shared with `dev.ts` (same options); they can't drift on bundle behavior between dev and prod.
- **Con:** First build cold-starts the GH Actions runner (~30s). Subsequent updates take ~15-20s end-to-end. Acceptable for a demo.
- **Con:** GH Pages doesn't preview-per-PR by default. If we want preview URLs for visual changes (which would be useful given the visual-evidence convention), we'd need a separate workflow that publishes to a path like `/tessera/preview/pr-N/`. Defer; for now reviewers eyeball locally + the committed screenshots.
- **Con:** Pages source has to be configured by hand once. Documented inline in the workflow comment so future contributors aren't confused why nothing's deploying.

## Alternatives considered

- **Vercel.** Strong dev-experience, preview-per-branch. But: another account, another set of secrets, another bill to monitor. Overkill for a static demo. Rejected.
- **Cloudflare Pages.** Faster than Vercel, generous free tier. Same separate-service tradeoff. Rejected.
- **`gh-pages` branch via `peaceiris/actions-gh-pages`.** Older pattern — uses a `gh-pages` branch holding built artifacts. Works fine but the modern `actions/deploy-pages` route is officially supported by GitHub and doesn't require a special branch. Rejected.
- **Don't deploy.** The local-only demo was the v0.1 stance. v0.2.0's demo is good enough that it's worth a URL; not deploying it is leaving value on the table. Rejected.

## Rollback

If a deploy publishes a broken demo:

1. Revert the offending commit on `main` (a chore/revert PR through the standard cycle).
2. The next push to `main` triggers Pages to rebuild from the reverted state.
3. If GH Pages is broken structurally (bad workflow), disable the workflow in the Actions tab; the last successful deploy stays live.
