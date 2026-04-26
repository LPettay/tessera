# ADR 0011: `examples/` directory and the Bun-served dev pattern

## Status

Accepted — 2026-04-25

## Context

Two needs converged in this PR:

1. **A regression test for the v0.1 public API.** The framework's first PRs (#1 types, #2 page-citizenship, #3 SVG renderer) shipped without an integration test that mounts a real `Scene` and verifies it renders. The MotionPitch coffee mug — which inspired the entire framework — is the natural first example and the most honest end-to-end test.
2. **A demoable artifact.** "Demo working locally" was a goal Lance flagged early (`bun run dev:<x>` produces something visible in a browser). For an OSS framework, examples are also the marketing surface — what you point at when someone asks "what does this do?"

Both needs are served by a top-level `examples/` directory rather than burying demos inside `src/` or in a separate repo.

## Decision

A new top-level directory: `examples/<example-name>/` per demo, each self-contained:

```
examples/
├── AGENTS.md
└── mug-svg/
    ├── AGENTS.md
    ├── mug-scene.ts     # Scene definition
    ├── main.ts          # browser entry
    ├── index.html       # static page that hosts the demo
    └── dev.ts           # Bun.serve dev server
```

Conventions enforced via `scripts/lib/config.ts`:

- `examples` is added to `agentsRequiredRoots` so every example directory must carry an `AGENTS.md`.
- Each example registers a `dev:<name>` script in the root `package.json`.
- Examples consume **only** the public API (`import from "../../src/index.ts"`). Reaching into `src/core/` or `src/renderers/` is forbidden — the example is the public-API smoke test, and bypassing the boundary defeats that.

The dev server uses `Bun.serve` + `Bun.build` directly: no Vite, no Webpack, no separate dev-dep:

```ts
Bun.serve({
  port,
  async fetch(req) {
    if (path === "/main.js") {
      const result = await Bun.build({ entrypoints: ["./main.ts"], target: "browser" });
      return new Response(result.outputs[0], { headers: { "Content-Type": "application/javascript" } });
    }
    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file("./index.html"));
    }
    return new Response("not found", { status: 404 });
  },
});
```

This pattern is canonical — every future example uses the same shape. A static-build path (for GitHub Pages deployment) is a separate concern; that comes in PR #5 with `bun build` writing to `dist/`.

## Consequences

- **Pro:** First-class regression test against the public API surface, written in the same language as the framework.
- **Pro:** Zero new dev dependencies — Bun's stdlib does both serve and bundle.
- **Pro:** A single command, `bun run dev:mug`, opens a browser window with the demo. No setup overhead for new contributors.
- **Pro:** The pattern scales — adding `examples/mug-canvas2d/` or `examples/particles-webgl2/` is a new directory with the same five files.
- **Con:** Every page reload re-bundles. Acceptable at this size (~few hundred KB) and gives an honest feedback loop. If bundle time grows, `Bun.build`'s incremental mode or a watch-and-cache layer can be added later.
- **Con:** Examples and the framework share the same `package.json` and lockfile. If an example ever needs a runtime dep the framework doesn't, the cleanest answer is a workspace split — not done now because no example needs one.

## Alternatives considered

- **Vite as the dev tool** — adds a heavy dep, an ecosystem of plugins, and a config file. Bun's primitives are sufficient and consistent with ADR 0001 (Bun-only). Rejected.
- **A separate `tessera-examples` repo** — keeps the framework repo small but disconnects examples from the framework's CI. The example failing is information the framework needs in its own pipeline. Rejected.
- **Examples inside `src/`** — pollutes the framework source tree with non-published code. Rejected.
- **Storybook or similar component-explorer tool** — heavyweight, React-shaped, doesn't match Tessera's vanilla-TS-first design. Rejected.
