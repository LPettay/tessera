/**
 * Post-merge scope review — runs after a PR merges to main.
 *
 * Fetches the PR diff + touched AGENTS.md files, sends them to Claude,
 * and creates GitHub issues for each improvement opportunity Claude
 * identifies. Uses tool_use to guarantee structured output and prompt
 * caching on the static system context.
 *
 * Required env vars (all injected by the GitHub Actions workflow):
 *   ANTHROPIC_API_KEY   — Anthropic API key
 *   GITHUB_TOKEN        — GitHub token with issues:write + pull-requests:read
 *   PR_NUMBER           — merged PR number
 *   GITHUB_REPOSITORY   — "owner/repo" (e.g. "LPettay/tessera")
 */

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ---- env ----------------------------------------------------------------- //

const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY ?? "LPettay/tessera";

if (!PR_NUMBER) {
  console.error("scope-review: PR_NUMBER not set — nothing to do");
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("scope-review: ANTHROPIC_API_KEY not set");
  process.exit(1);
}

// ---- gather PR context --------------------------------------------------- //

console.log(`scope-review: analysing PR #${PR_NUMBER} on ${REPO}`);

const prMeta = JSON.parse(
  execSync(`gh pr view ${PR_NUMBER} --repo ${REPO} --json title,body,files`, {
    encoding: "utf-8",
  }),
) as { title: string; body: string; files: { path: string }[] };

// Truncate diff to keep prompt manageable (Claude context is large but we
// don't want to send 50k lines of generated SVG fixtures).
const rawDiff = execSync(`gh pr diff ${PR_NUMBER} --repo ${REPO} --patch`, {
  encoding: "utf-8",
});
const diff = rawDiff.length > 24_000 ? rawDiff.slice(0, 24_000) + "\n…(truncated)" : rawDiff;

// Pull in the AGENTS.md files for directories the PR touched — gives Claude
// the design intent behind each module without shipping the whole codebase.
const touchedTopDirs = [
  ...new Set(prMeta.files.map((f) => f.path.split("/").slice(0, 2).join("/"))),
];
const agentsDocs = touchedTopDirs
  .map((dir) => `${dir}/AGENTS.md`)
  .filter((p) => existsSync(p))
  .map((p) => `### ${p}\n${readFileSync(p, "utf-8")}`)
  .join("\n\n");

// ---- tool definition ----------------------------------------------------- //

const PROPOSE_ISSUES_TOOL: Anthropic.Tool = {
  name: "propose_issues",
  description:
    "Propose 2–5 GitHub issues that would concretely improve the codebase based on what this PR changed. Each issue must be specific, actionable, and reference the PR context.",
  input_schema: {
    type: "object" as const,
    required: ["issues"],
    properties: {
      issues: {
        type: "array",
        minItems: 0,
        maxItems: 5,
        items: {
          type: "object",
          required: ["title", "body", "labels"],
          properties: {
            title: {
              type: "string",
              description: "Concise issue title (under 72 chars). No leading verb like 'Add' unless truly a new feature.",
            },
            body: {
              type: "string",
              description: "Markdown body. Include: what the issue is, why it matters, and a concrete definition of done. Reference the PR by number.",
            },
            labels: {
              type: "array",
              items: {
                type: "string",
                enum: ["enhancement", "bug", "documentation", "tech-debt", "test", "abstraction"],
              },
              description: "1–2 labels from the allowed set.",
            },
          },
        },
      },
    },
  },
};

// ---- system prompt ------------------------------------------------------- //

const SYSTEM = `You are a senior engineer reviewing merged PRs on Tessera — a TypeScript framework for layered 2D voxel-cell scenes. Pluggable renderers (SVG / Canvas2D / WebGL2). Pure-data scene description. L0–L5 abstraction stack:
  L0 atom: VoxelSpriteCell / Entity
  L1 drawing helpers: rect, grid, outline, gradient, lerpColor, rasterizeText
  L2 scene fragments: SceneFragment = Layer[], composeScene(...)
  L3 layout (planned)
  L4 behaviour: onFrame / setOffset cursor fields
  L5 composition (planned)

Project conventions:
- ADR per public API addition (docs/decisions/)
- AGENTS.md in every directory; freshness-stamped to main HEAD
- Examples consume src/index.ts public API only — no internal imports
- Bun runtime; lefthook pre-commit runs check + typecheck
- Layout invariant tests live alongside components (*.test.ts)

Your job: given a merged PR's diff and relevant AGENTS.md context, identify concrete improvements the codebase now needs. Think about:
1. Missing abstractions — did this PR repeat a pattern that should be a reusable helper or DSL?
2. Missing tests — are there new invariants with no test coverage?
3. Documentation gaps — does an ADR need writing, or is an AGENTS.md incomplete?
4. Follow-up scope — what's the natural "next layer" of work this PR unlocks?
5. Latent bugs — edge cases or off-by-ones introduced that will bite later?

Quality bar: propose only issues you are confident are worth doing. Zero issues is better than five weak ones. Each issue must be specific enough that a developer could start it without asking questions.`;

// ---- call Claude --------------------------------------------------------- //

const client = new Anthropic();

const userContent = `PR #${PR_NUMBER}: ${prMeta.title}

## PR description
${prMeta.body ?? "(no description)"}

## Relevant AGENTS.md context
${agentsDocs || "(none in touched directories)"}

## Diff
\`\`\`diff
${diff}
\`\`\``;

console.log("scope-review: calling Claude…");

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: SYSTEM,
      // Cache the static system context — it doesn't change between PR runs.
      cache_control: { type: "ephemeral" },
    },
  ],
  tools: [PROPOSE_ISSUES_TOOL],
  tool_choice: { type: "tool", name: "propose_issues" },
  messages: [{ role: "user", content: userContent }],
});

const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
if (!toolUse) {
  console.error("scope-review: Claude returned no tool_use block — skipping");
  process.exit(0);
}

const { issues } = toolUse.input as { issues: Array<{ title: string; body: string; labels: string[] }> };

console.log(`scope-review: Claude proposed ${issues.length} issue(s)`);
if (issues.length === 0) {
  console.log("scope-review: no issues to create — done");
  process.exit(0);
}

// ---- create GitHub issues ------------------------------------------------ //

const prLink = `\n\n---\n_Opened automatically by scope-review after PR #${PR_NUMBER} merged._`;

for (const issue of issues) {
  const body = issue.body + prLink;
  const labels = ["scope-review", ...issue.labels].join(",");

  // Write body to a temp file to avoid shell-quoting nightmares.
  const tmp = join(tmpdir(), `scope-review-${Date.now()}.md`);
  writeFileSync(tmp, body, "utf-8");

  try {
    const result = execSync(
      `gh issue create --repo ${REPO} --title ${JSON.stringify(issue.title)} --body-file ${tmp} --label ${JSON.stringify(labels)}`,
      { encoding: "utf-8" },
    ).trim();
    console.log(`scope-review: created issue → ${result}`);
  } catch (err) {
    // Label may not exist yet — retry without custom labels.
    console.warn(`scope-review: label creation failed, retrying without labels: ${err}`);
    const fallback = execSync(
      `gh issue create --repo ${REPO} --title ${JSON.stringify(issue.title)} --body-file ${tmp}`,
      { encoding: "utf-8" },
    ).trim();
    console.log(`scope-review: created issue (no labels) → ${fallback}`);
  }
}

console.log("scope-review: done");
