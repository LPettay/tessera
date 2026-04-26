# ADR 0006: Vanilla TypeScript core, thin React adapter

## Status

Accepted — 2026-04-25

## Context

Tessera's first consumer is a React app (the MotionPitch hackathon project) — a React-first design would ship faster for that single consumer. But the framework's stated direction is "extensible, capable of game-engine-like things eventually." Game-engine-shaped workloads have requirements that React-first design cannot satisfy without a rewrite:

- 60fps render loops with React's reconciler in the hot path is the wrong shape — it adds GC pressure and reconciliation overhead per frame.
- Tier 3 (WebGL2) and Tier 4 (WebGPU) want the engine to run in an OffscreenCanvas + Worker. React in a Worker is awkward at best.
- Headless test runs (Node, no DOM) need the engine without React.
- Future Vue / Solid / web-components adapters need an engine that doesn't drag React along.

## Decision

The engine is **vanilla TypeScript** with **zero runtime dependencies** in `src/core/`. React lives in a thin adapter at `src/adapters/react/` that wraps the engine's imperative API (`createScene()`, `scene.tick()`, etc.) into a declarative `<TesseraScene />` component plus hooks (`useScene`, `useEntity`).

Concrete rules (enforced by review and by `AGENTS.md` in `src/core/`):

- **No React imports anywhere under `src/core/`** — not as types, not as runtime.
- **No DOM-only assumptions in `src/core/`** — must run in Node for tests and in a Worker.
- **Renderers can use DOM APIs** (`src/renderers/svg/` uses `document`, etc.) but never React.
- The React adapter is published as part of `tessera-engine` initially; it may split into `@tessera/react` as a separate package if/when Vue/Solid adapters land.

## Consequences

- **Pro:** Engine can run in OffscreenCanvas + Worker without React baggage.
- **Pro:** Engine can run headless in Node for tests.
- **Pro:** Vue/Solid/web-components adapters slot in as future packages without engine changes.
- **Pro:** No reconciler in the render hot path.
- **Con:** Two surfaces to learn for React users (`createScene()` imperative + `<TesseraScene />` declarative). Mitigated by docs that teach the React surface first.
- **Con:** Slightly more upfront work to design the imperative core and the adapter as separate concerns.

## Alternatives considered

- **React-first** — faster for MotionPitch, but closes the door on game-engine workloads, Worker rendering, and non-React adopters. Rejected — incompatible with stated direction.
- **Solid-first** — finer-grained reactivity than React, better fit for game loops, but smaller ecosystem and same single-framework lock-in. Rejected.
- **Web-components-first** — framework-neutral by design, but custom-element ergonomics are awkward for a scene graph and TypeScript inference suffers. Rejected as the primary adapter; viable as a future option.
