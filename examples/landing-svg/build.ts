/**
 * Static build for the landing-svg example.
 *
 *   bun run build:landing
 *
 * Outputs to `dist/landing/`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const exampleDir = resolve(import.meta.dir);
const outDir = resolve(exampleDir, "../../dist/landing");

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
console.log(`built dist/landing/  (${result.outputs.length} files, ${(bytes / 1024).toFixed(1)} KB)`);
