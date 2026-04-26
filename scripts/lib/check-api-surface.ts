import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { CheckResult, Finding } from "./types.ts";

/**
 * Layer 6 — the public API surface is whatever `src/index.ts` re-exports.
 * Changes to that file must come with an ADR.
 *
 * Mechanism: this check extracts the set of exported names from
 * `src/index.ts` and compares them against a stamped snapshot at
 * `docs/api-surface.txt`. If the surfaces differ and no ADR has been added
 * in the same PR, the check fails.
 *
 * v0 placeholder: while `src/index.ts` does not yet exist (or has no
 * exports), this check is a no-op. It activates the moment we ship the
 * first export, at which point the snapshot file gets created and
 * subsequent diffs are gated.
 */
export function checkApiSurface(repoRoot: string): CheckResult {
  const findings: Finding[] = [];
  const indexPath = join(repoRoot, "src", "index.ts");
  const snapshotPath = join(repoRoot, "docs", "api-surface.txt");

  if (!existsSync(indexPath)) {
    return { name: "api-surface", findings };
  }

  const content = readFileSync(indexPath, "utf8");
  const exports = extractExportNames(content);

  if (exports.length === 0) {
    return { name: "api-surface", findings };
  }

  const current = exports.slice().sort().join("\n") + "\n";

  if (!existsSync(snapshotPath)) {
    findings.push({
      severity: "error",
      code: "API_SNAPSHOT_MISSING",
      message: `src/index.ts has ${exports.length} exports but no snapshot exists at docs/api-surface.txt`,
      path: relative(repoRoot, indexPath),
      fix: `Write the current exports to docs/api-surface.txt and add an ADR documenting the initial API surface.`,
    });
    return { name: "api-surface", findings };
  }

  const snapshot = readFileSync(snapshotPath, "utf8");
  if (snapshot !== current) {
    findings.push({
      severity: "error",
      code: "API_SURFACE_CHANGED",
      message: `Public API surface in src/index.ts differs from docs/api-surface.txt snapshot`,
      path: relative(repoRoot, indexPath),
      fix: `If the change is intentional: add an ADR in docs/decisions/ and update docs/api-surface.txt to match. If not: revert the change to src/index.ts.`,
    });
  }

  return { name: "api-surface", findings };
}

/**
 * Extract exported names from a TypeScript file. Handles:
 *   export { foo, bar }
 *   export { foo as bar }
 *   export * from "./mod"     (records as "*")
 *   export const foo = ...
 *   export function foo()
 *   export class Foo
 *   export type Foo
 *   export interface Foo
 *   export enum Foo
 *   export default ...        (records as "default")
 *
 * Comments and string literals are NOT scrubbed — this is a coarse
 * heuristic, not a full parser. Adequate for a stamped re-export list.
 */
function extractExportNames(source: string): string[] {
  const names = new Set<string>();

  // export { a, b as c, d } from "..."  OR  export { a, b }
  // OR  export type { a, b } from "..."  OR  export { type a, b as c }
  const braceRe = /export(?:\s+type)?\s*\{([^}]*)\}/g;
  for (let m: RegExpExecArray | null; (m = braceRe.exec(source)); ) {
    const inner = m[1];
    if (!inner) continue;
    for (const piece of inner.split(",")) {
      // Strip a leading inline `type` keyword (e.g. `type Foo` in `export { type Foo }`).
      const trimmed = piece.trim().replace(/^type\s+/, "");
      if (!trimmed) continue;
      const asMatch = /\bas\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
      const name = asMatch ? asMatch[1] : trimmed.split(/\s+/)[0];
      if (name) names.add(name);
    }
  }

  // export * from "..." OR export * as ns from "..."
  const starRe = /export\s+\*(\s+as\s+([A-Za-z_$][\w$]*))?\s+from/g;
  for (let m: RegExpExecArray | null; (m = starRe.exec(source)); ) {
    names.add(m[2] ?? "*");
  }

  // export const|let|var|function|class|type|interface|enum NAME
  const declRe = /export\s+(?:default\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (let m: RegExpExecArray | null; (m = declRe.exec(source)); ) {
    if (m[1]) names.add(m[1]);
  }

  // export default <expr>
  if (/export\s+default\b/.test(source)) {
    names.add("default");
  }

  return Array.from(names);
}
