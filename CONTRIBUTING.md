# Contributing

Tessera is a TypeScript framework. These conventions exist to keep the API stable, the docs honest, and parallel agents from stepping on each other.

---

## Ground rules

1. **`main` always passes CI and the examples build.** Anything that breaks either is a P0.
2. **No scope creep.** Out-of-scope items for the current milestone go to the next milestone, not the current PR. See the firewall in [`AGENTS.md`](./AGENTS.md#anti-scope-creep-firewall-milestone-scoped).
3. **API surface is sacred.** Changes to `src/index.ts` re-exports require an ADR.
4. **Visible progress.** Push to a branch and open a PR every meaningful change — don't accumulate days of work on a local branch.

---

## Branching

- `main` is always green
- Feature branches: `feat/<short-description>` (e.g. `feat/svg-renderer`)
- Fix branches: `fix/<short-description>`
- Docs branches: `docs/<short-description>`
- Chore branches: `chore/<short-description>`

---

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). Imperative mood, lowercase, no trailing period.

```
feat: add svg renderer scaffold
fix: correct cell-grid coordinate math at viewport edge
docs: update architecture diagram with webgpu tier
chore: bump typescript to 5.6
```

For multi-line commits, use a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
feat: add svg renderer scaffold

- Renderer interface in src/core/renderer.ts
- SVG implementation under src/renderers/svg/
- Worth one example port: motionpitch coffee mug
EOF
)"
```

---

## Parallel agents → one worktree per agent

A single git checkout has **one `HEAD`**. Two sessions sharing the same checkout will trample each other's `git switch`, and you'll silently end up with branches rooted at the wrong tip.

The rule: **one worktree per concurrent agent.** If you're spinning up a parallel session, create a worktree for it first.

```bash
bun run wt:add feat/svg-renderer       # creates ../Tessera-wt/feat-svg-renderer
bun run wt:list                         # see all worktrees
bun run wt:remove feat/svg-renderer    # tear down (deletes branch only if merged to origin/main)
```

Then open the printed worktree path in a new editor window. That session has its own independent `HEAD`, index, stash, and pre-commit invocation.

The primary checkout (`~/Tessera`) stays on `main`, used only for pulls and admin. All real work happens in worktrees.

Rationale: [`docs/decisions/0003-git-worktrees-for-parallel-agents.md`](./docs/decisions/0003-git-worktrees-for-parallel-agents.md).

---

## Pull requests

`main` is **branch-protected**. You cannot push directly (except for the bootstrap commits in initial history). Every change goes through this loop:

```bash
git switch main && git pull --ff-only         # start from latest main
git switch -c feat/<short-slug>               # new branch per change
# ... do the work ...
bun run check                                 # quick local sanity (pre-commit will too)
git add . && git commit -m "feat: ..."        # conventional commit
git push -u origin HEAD                       # push the branch
gh pr create --fill                           # open PR using the template
# ... wait for CI ...
gh pr merge --squash --delete-branch          # merge once green
git switch main && git pull --ff-only         # sync local main
```

### Rules (enforced by GitHub branch protection)

1. **Open against `main`** — direct pushes are blocked
2. **Use the PR template** — `gh pr create --fill` will populate it
3. **CI must pass** (`hygiene` job: repo checks + typecheck) before merge
4. **Self-review your diff** before merging — `gh pr diff` or the web UI
5. **Keep PRs small** (< 300 lines diff ideal); huge PRs get rejected at the door
6. **API surface changes require an ADR in the same PR** (see `docs/decisions/AGENTS.md`)

### Solo-merge is allowed

Approval count is set to **0** so solo work isn't blocked, but the PR is still required and CI still gates the merge. The PR template is the paper trail.

### Squash-merge always

We squash-merge so `main` history stays one-commit-per-PR. Conventional Commit titles on the PR become the commit message on `main`.

---

## Code style

- **TypeScript strict mode** is on. No `any` without a comment explaining why.
- **No comments that narrate code.** Comments explain *why*, not *what*.
- **No React inside `src/core/`.** React lives in a thin adapter only.
- **Each renderer is independently shippable.** Do not import one renderer from another.
- **One concern per file.** If a file exceeds ~200 lines, consider splitting.

---

## API surface contract

The public API is everything re-exported from `src/index.ts`. Changes to that file:

1. **Require an ADR** in `docs/decisions/` describing the addition/removal/rename.
2. **Trigger the `check-api-surface` enforcement** (when wired up; currently a placeholder until `src/index.ts` has its first export).
3. **Bump the major version** if the change is breaking and the package is post-v1.

Internal modules (anything not re-exported from `src/index.ts`) can be refactored freely without an ADR.

---

## Enforcement

| Layer | What it catches | When |
|---|---|---|
| **1. Documentation** | Intent only — describes the rules | Always |
| **2. `bun run check`** | Missing AGENTS.md, forbidden lockfiles, stale stamps | Manual or pre-commit |
| **3. Pre-commit (lefthook)** | Runs `bun run check` automatically | Every `git commit` |
| **4. Editor hooks** *(optional)* | Live nudge when writing to a dir without AGENTS.md | While editing |
| **5. CI (GitHub Actions)** | Backstop — same checks plus typecheck | Every push & PR |

### The freshness contract

Every `AGENTS.md` carries a footer:

```markdown
<!-- last-reviewed: 0d84014 -->
```

When more than **5 non-AGENTS files** in its directory change after that SHA, the doc is stale and `bun run check` will fail until you:

1. Read the current `AGENTS.md` for that directory
2. Read what changed: `git diff <sha>..HEAD -- <dir>`
3. Edit the AGENTS.md if it no longer reflects the directory
4. Re-stamp it: `bun run agents:stamp <path-to-agents-md>`

To stamp every AGENTS.md at once: `bun run agents:stamp-all`.
To see what's stale: `bun run agents:stale`.

### Bypassing checks

If you absolutely must commit through a failure, use `git commit --no-verify` and document **why** in the commit body. CI will still catch it on push.

---

## Filing issues

Use the [issue templates](./.github/ISSUE_TEMPLATE/) when available. Tag issues with the milestone they target (`v0.1`, `v0.2`, etc.) so the firewall stays honest.
