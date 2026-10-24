# Implementation Plan 50 — Roadmap & Release Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #roadmap #release #versioning #changelog #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (root `package.json` + `cli/package.json` versioned independently; `CHANGELOG.md`; Conventional Commits style; `tests/__baseline__/verify-no-regression.mjs` as the release gate; existing `scripts/` helpers).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the changelog generator on real commits; dry-run the release script; confirm version checks.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-50-roadmap-release-management.md`, `../research/9router/impl-plan-32-ci.md`, `../research/9router/impl-plan-33-docs.md`.

## Scope

**In scope:** `docs/ROADMAP.md` derived from the research corpus (themes → epics → items with impact×effort scoring); `docs/RELEASING.md` (branch → test → baseline → tag → publish + rollback); semver discipline with root/cli alignment checks; changelog generation from Conventional Commits with coverage check.
**Out of scope:** npm publishing automation beyond dry-run; GitHub Actions wiring (plan 32).

## Milestones

### M1 — Roadmap from research corpus

**Reference code (`scripts/gen-roadmap.mjs`):**

```js
// Scans research/9router/impl-plan-*.md frontmatter + titles → roadmap items.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "docs", "plans-and-prompts", "research", "9router");
const items = [];
for (const file of fs.readdirSync(dir).filter((f) => f.startsWith("impl-plan-"))) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");
  const title = content.match(/^# Implementation Plan \d+[^—]*—\s*(.+)$/m)?.[1]?.trim() ?? file;
  const tags = content.match(/^Tags:.*$/m)?.[0] ?? "";
  items.push({ file, title, tags });
}
// Group by theme (from tags), score by impact/effort (heuristic: length + deps).
const roadmap = { generatedAt: new Date().toISOString(), themes: groupByTheme(items) };
fs.writeFileSync(path.join(process.cwd(), "docs", "ROADMAP.md"),
  `# Roadmap\n\n> Auto-generated from the research corpus by \`scripts/gen-roadmap.mjs\`.\n\n${render(items)}\n`);
console.log(`Wrote ${items.length} roadmap items`);

function groupByTheme(items) { /* group by primary tag */ return items; }
function render(items) { return items.map((i) => `- [ ] ${i.title} (\`${i.file}\`)`).join("\n"); }
```

**Acceptance criteria:** ROADMAP.md generated from corpus; themes grouped; items link to source plans.

### M2 — Release process doc + checklist

**Reference code (`docs/RELEASING.md`):**

```markdown
# Releasing 9Router

## Flow
1. Branch: `release/vX.Y.Z` from main.
2. Test: `npx vitest run` (tests/) + `tests/__baseline__/verify-no-regression.mjs` — must be green vs baseline.
3. Changelog: `node scripts/gen-changelog.mjs` (from Conventional Commits since last tag).
4. Version: bump root + cli (semver; independent versions allowed, both recorded).
5. Tag: `git tag vX.Y.Z` (root) + `cli-vX.Y.Z` (cli package).
6. Publish: `npm run cli:pack` → publish `9router`; root app ships via Docker (plan 41).
7. Verify: smoke test (scripts/smoke-test.mjs) against the built artifact.

## Rollback
- Keep previous tag; `git checkout vX.Y.Z-1` → rebuild → redeploy.
- DB migrations are forward-only (plan 39) — restore from backup for downgrade.
```

**Acceptance criteria:** doc complete; checklist executable by an agent.

### M3 — Versioning discipline

**Reference code (`scripts/check-versions.mjs`):**

```js
// Checks root + cli versions are semver and aligned where required.
import { readFileSync } from "node:fs";

const root = JSON.parse(readFileSync("package.json", "utf8"));
const cli = JSON.parse(readFileSync("cli/package.json", "utf8"));
const semver = /^\d+\.\d+\.\d+$/;

const problems = [];
if (!semver.test(root.version)) problems.push(`root version not semver: ${root.version}`);
if (!semver.test(cli.version)) problems.push(`cli version not semver: ${cli.version}`);
// Rule: cli may lag root but never lead by more than one minor.
const [rmaj, rmin] = root.version.split(".").map(Number);
const [cmaj, cmin] = cli.version.split(".").map(Number);
if (cmaj > rmaj || (cmaj === rmaj && cmin > rmin + 1)) {
  problems.push(`cli version ${cli.version} leads root ${root.version} too far`);
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`versions ok: root=${root.version} cli=${cli.version}`);
```

**Acceptance criteria:** script exits non-zero on violations; wired into release flow.

### M4 — Changelog automation

**Reference code (`scripts/gen-changelog.mjs`):**

```js
// Generates CHANGELOG.md section from Conventional Commits since last tag.
import { execSync } from "node:child_process";

const since = process.argv[2] ?? "HEAD~50";
const log = execSync(`git log --oneline --no-merges ${since}`, { encoding: "utf8" });
const categories = { feat: "Features", fix: "Fixes", perf: "Performance", security: "Security", breaking: "Breaking Changes" };
const grouped = {};

for (const line of log.trim().split("\n")) {
  const m = line.match(/^[0-9a-f]+\s+(feat|fix|perf|security|breaking)(\([^)]+\))?!?:\s*(.+)$/);
  if (!m) continue;
  const cat = m[1] === "breaking" ? "breaking" : m[1];
  (grouped[cat] ??= []).push(`- ${m[3]}`);
}

let out = `## Unreleased (generated ${new Date().toISOString().slice(0, 10)})\n\n`;
for (const [key, label] of Object.entries(categories)) {
  if (grouped[key]?.length) out += `### ${label}\n${grouped[key].join("\n")}\n\n`;
}
// Coverage check: warn if commits exist that match no category.
const unmatched = log.trim().split("\n").filter((l) => !/^(feat|fix|perf|security|breaking)(\(|:)/.test(l.replace(/^[0-9a-f]+\s+/, "")));
if (unmatched.length) console.warn(`Uncategorized commits: ${unmatched.length}`);
console.log(out);
```

**Files touched:** `docs/ROADMAP.md` (new, generated), `docs/RELEASING.md` (new), `scripts/release.mjs` (new: orchestrates M2-M4), `scripts/gen-changelog.mjs` (new), `scripts/check-versions.mjs` (new), `CHANGELOG.md` (generated).

**Acceptance criteria:** changelog generated from commits; coverage check warns on uncategorized; release script dry-runs.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Roadmap staleness | Drift | Regenerate on corpus change |
| Release friction | Skipped steps | Automated checklist |
| Version drift | Root/cli mismatch | check-versions in CI |
| Changelog gaps | Missing entries | Coverage check |

## Verification

- Scripts: gen-roadmap, gen-changelog, check-versions, release dry-run
- Manual: full release drill on a test tag
- Regression: `tests/__baseline__/verify-no-regression.mjs`