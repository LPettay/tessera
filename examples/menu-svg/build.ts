/**
 * Static build for the menu-svg example.
 *
 *   bun run build:menu
 *
 * Outputs to `dist/menu/` so it can coexist with the mug-svg deploy at
 * `dist/`. Wiring this into the GH Pages workflow (a multi-example
 * landing page) is intentionally not part of this PR.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const exampleDir = resolve(import.meta.dir);
const outDir = resolve(exampleDir, "../../dist/menu");

await mkdir(outDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [resolve(exampleDir, "main.ts")],
  target: "browser",
  format: "esm",
  outdir: outDir,
  naming: "[name].[ext]",
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const html = await Bun.file(resolve(exampleDir, "index.html")).text();
await writeFile(resolve(outDir, "index.html"), html, "utf8");

const bytes = result.outputs.reduce((sum, o) => sum + o.size, 0);
console.log(`built dist/menu/  (${result.outputs.length} files, ${(bytes / 1024).toFixed(1)} KB)`);
