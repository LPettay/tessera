#!/usr/bin/env bun
/**
 * Manage git worktrees for parallel agent sessions.
 *
 * Two parallel agents in the same checkout WILL trample each other —
 * there is one HEAD per checkout. Each parallel agent must work in its
 * own worktree.
 *
 * Usage:
 *   bun run wt:add <branch-name>     # create worktree at ../Tessera-wt/<slug>
 *   bun run wt:list                  # show every worktree
 *   bun run wt:remove <branch-name>  # remove worktree (and prune branch if merged)
 *
 * Layout (sibling-of-repo, not nested):
 *   ~/Tessera/                          ← primary, always on `main`
 *   ~/Tessera-wt/feat-svg-renderer/     ← worktree on feat/svg-renderer
 *
 * Branch slugs with `/` are flattened to `-` for the directory name.
 * The branch keeps its slash; the directory does not.
 *
 * Exit codes: 0 ok, 1 error, 2 bad invocation.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve, dirname } from "node:path";

type Sub = "add" | "list" | "remove";

function main(): void {
  const argv = process.argv.slice(2);
  const sub = argv[0] as Sub | undefined;

  if (!sub || !["add", "list", "remove"].includes(sub)) {
    usage();
    process.exit(2);
  }

  const repoRoot = resolve(import.meta.dir, "..");

  switch (sub) {
    case "add":
      add(repoRoot, argv[1]);
      break;
    case "list":
      list(repoRoot);
      break;
    case "remove":
      remove(repoRoot, argv[1]);
      break;
  }
}

function usage(): void {
  console.error("usage:");
  console.error("  bun run wt:add <branch-name>");
  console.error("  bun run wt:list");
  console.error("  bun run wt:remove <branch-name>");
  console.error("");
  console.error("examples:");
  console.error("  bun run wt:add feat/svg-renderer");
  console.error("  bun run wt:add docs/architecture-update");
}

function add(repoRoot: string, branch: string | undefined): void {
  if (!branch) {
    console.error("error: missing branch name");
    usage();
    process.exit(2);
  }
  if (!isValidBranch(branch)) {
    console.error(`error: invalid branch name '${branch}' (use lowercase, /, -, _)`);
    process.exit(2);
  }

  const wtPath = worktreePath(repoRoot, branch);
  if (existsSync(wtPath)) {
    console.error(`error: worktree already exists at ${wtPath}`);
    process.exit(1);
  }

  ensureFreshOriginMain(repoRoot);

  const branchExistsLocal = commandOk(repoRoot, `git show-ref --verify --quiet refs/heads/${branch}`);
  const branchExistsRemote = commandOk(repoRoot, `git show-ref --verify --quiet refs/remotes/origin/${branch}`);

  let cmd: string;
  let mode: string;
  if (branchExistsLocal) {
    cmd = `git worktree add "${wtPath}" "${branch}"`;
    mode = `existing local branch ${branch}`;
  } else if (branchExistsRemote) {
    cmd = `git worktree add --track -b "${branch}" "${wtPath}" "origin/${branch}"`;
    mode = `tracking origin/${branch}`;
  } else {
    cmd = `git worktree add -b "${branch}" "${wtPath}" origin/main`;
    mode = `new branch from origin/main`;
  }

  console.log(`creating worktree (${mode})…`);
  run(repoRoot, cmd);

  console.log("");
  console.log(`✓ worktree ready: ${wtPath}`);
  console.log(`  branch:        ${branch}`);
  console.log("");
  console.log("next:");
  console.log(`  cd "${wtPath}" && bun install   # first time only`);
  console.log("");
  console.log("when done:");
  console.log(`  bun run wt:remove ${branch}`);
}

function list(repoRoot: string): void {
  const out = run(repoRoot, "git worktree list", { capture: true });
  process.stdout.write(out);
}

function remove(repoRoot: string, branch: string | undefined): void {
  if (!branch) {
    console.error("error: missing branch name");
    usage();
    process.exit(2);
  }

  const wtPath = worktreePath(repoRoot, branch);
  if (!existsSync(wtPath)) {
    console.error(`error: no worktree at ${wtPath}`);
    process.exit(1);
  }

  console.log(`removing worktree at ${wtPath}…`);
  run(repoRoot, `git worktree remove "${wtPath}"`);

  const merged = run(repoRoot, `git branch --merged origin/main`, { capture: true });
  const isMerged = merged.split("\n").some((line) => line.trim().replace(/^\* /, "") === branch);

  if (isMerged) {
    console.log(`branch ${branch} is merged to origin/main; deleting…`);
    run(repoRoot, `git branch -d "${branch}"`);
  } else {
    console.log(`branch ${branch} kept (not merged to origin/main).`);
    console.log(`  delete manually if intended: git branch -D ${branch}`);
  }

  console.log("");
  console.log("✓ done");
}

function worktreePath(repoRoot: string, branch: string): string {
  const repoName = basename(repoRoot);
  const parent = dirname(repoRoot);
  const slug = branch.replace(/\//g, "-");
  return resolve(parent, `${repoName}-wt`, slug);
}

function isValidBranch(name: string): boolean {
  return /^[a-z0-9][a-z0-9._/-]*$/i.test(name) && !name.includes("..") && !name.endsWith("/");
}

function ensureFreshOriginMain(repoRoot: string): void {
  console.log("fetching origin…");
  run(repoRoot, "git fetch origin --prune", { capture: true });
}

type RunOpts = { capture?: boolean };
function run(cwd: string, cmd: string, opts: RunOpts = {}): string {
  try {
    const out = execSync(cmd, { cwd, stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    return out ? out.toString() : "";
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer };
    if (err.stderr) process.stderr.write(err.stderr);
    process.exit(err.status ?? 1);
  }
}

function commandOk(cwd: string, cmd: string): boolean {
  try {
    execSync(cmd, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

main();
