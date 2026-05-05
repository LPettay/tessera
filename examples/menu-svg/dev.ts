/**
 * Dev server for the menu-svg example.
 *
 *   bun run dev:menu
 *
 * Mirrors the mug-svg dev server — Bun.serve + Bun.build, no bundler config.
 */

import { resolve } from "node:path";

const root = resolve(import.meta.dir);
const port = Number(process.env.PORT ?? 3001);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname === "/" || pathname === "/index.html") {
      return new Response(Bun.file(`${root}/index.html`));
    }

    if (pathname === "/main.js") {
      const result = await Bun.build({
        entrypoints: [`${root}/main.ts`],
        target: "browser",
        format: "esm",
        minify: false,
      });
      if (!result.success) {
        const log = result.logs.map((l) => String(l)).join("\n");
        return new Response(`/* tessera dev: build failed */\n${log}`, {
          status: 500,
          headers: { "Content-Type": "application/javascript" },
        });
      }
      const out = result.outputs[0];
      if (!out) {
        return new Response("/* tessera dev: no output */", {
          status: 500,
          headers: { "Content-Type": "application/javascript" },
        });
      }
      return new Response(out, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`Tessera menu example: http://localhost:${port}`);
