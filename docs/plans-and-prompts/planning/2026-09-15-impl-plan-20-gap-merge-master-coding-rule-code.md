# Implementation Plan 20 — Gap Merge & Master Coding Rule Set — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #gap-merge #master-coding-rules #coverage #ci #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `AGENTS.md`, `eslint.config.mjs`, `scripts/` conventions, existing test baselines).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the scripts, check coverage, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-20-gap-merge-master-coding-rule.md`, `../research/9router/35-master-coding-rules.md`

## Scope

**In scope:** gap inventory (impact × effort prioritization); master coding rule set (`RULE-XXX: statement`); coverage check script; AGENTS.md integration; CI enforcement.
**Out of scope:** code style rules (handled by eslint); individual rule implementation (handled by other plans).

## Milestones

### M1 — Gap inventory

**Reference code (`research/9router/gap-inventory.md`):**

```markdown
# Gap Inventory

| Gap ID | Description | Area | Impact | Effort | Priority | Addressed By |
|--------|-------------|------|--------|--------|----------|-------------|
| GAP-001 | No unified error codes | error-system | high | medium | P1 | plan 09, 19 |
| GAP-002 | No routing observability | observability | high | high | P1 | plan 08 |
| GAP-003 | No eval harness | evaluation | medium | high | P2 | plan 07 |
| GAP-004 | No policy enforcement | governance | high | medium | P1 | plan 13 |
| GAP-005 | No credential lifecycle | oauth | high | medium | P1 | plan 11 |
| ... | (generated from all 36 plans) | | | | | |
```

**Generation script (`scripts/build-gap-inventory.mjs`):**

```js
// Scan planning/*.md for Scope sections → extract "In scope" items → map to gap IDs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const plansDir = "docs/plans-and-prompts/planning";
const files = readdirSync(plansDir).filter((f) => f.endsWith("-code.md"));
const gaps = [];
for (const f of files) {
  const content = readFileSync(join(plansDir, f), "utf8");
  const inScopeMatch = content.match(/\*\*In scope:\*\*\s*(.+)/);
  if (inScopeMatch) {
    gaps.push({ plan: f, inScope: inScopeMatch[1] });
  }
}
// Write to gap-inventory.md
```

**Acceptance criteria:** comprehensive gap inventory covering all plans; priority assigned.

### M2 — Master coding rule set

**Reference code (`docs/plans-and-prompts/research/9router/master-coding-rules.md`):**

```markdown
# Master Coding Rules

## Error Handling
- RULE-001: All error responses must use errorEnvelope() from open-sse/config/errorEnvelope.js
- RULE-002: Error codes must be registered in ERROR_CODES (no ad-hoc strings)
- RULE-003: Circuit breakers must use the pattern from open-sse/config/runtimeConfig.js
- RULE-004: Retry logic must respect noRetryErrors list

## Routing
- RULE-010: New routing strategies must be registered in open-sse/config/routerConfigs.js
- RULE-011: Model scoring must use the scoring function from open-sse/services/smartRouter.js
- RULE-012: Fallback chains must be bounded by maxFallbacks

## Data
- RULE-020: New repos must be added to src/lib/db/repos/ and exported from src/lib/db/index.js
- RULE-021: New settings keys must be added to DEFAULT_SETTINGS in settingsRepo.js
- RULE-022: Migrations must have both up and down functions

## Security
- RULE-030: Never log Authorization headers, API keys, or tokens (use redact())
- RULE-031: Interception must be opt-in with explicit allowlists
- RULE-032: Cert store permissions must be 0700 (directory) / 0600 (files)
```

**Acceptance criteria:** rules cover all plan areas; numbered and categorized.

### M3 — Coverage check script

**Reference code (`scripts/check-rule-coverage.mjs`):**

```js
// For each RULE-XXX, check that at least one plan/test file implements it.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const rules = parseRules(readFileSync("docs/plans-and-prompts/research/9router/master-coding-rules.md", "utf8"));
const planFiles = readdirSync("docs/plans-and-prompts/planning").filter((f) => f.endsWith("-code.md"));
const planTexts = planFiles.map((f) => readFileSync(join("docs/plans-and-prompts/planning", f), "utf8"));

for (const rule of rules) {
  const covered = planTexts.some((t) => t.includes(rule.id) || t.includes(rule.topic));
  console.log(`${rule.id} ${covered ? "✅" : "❌"} ${rule.statement}`);
}
```

**Acceptance criteria:** script runs; reports coverage; flags gaps.

### M4 — AGENTS.md integration + CI

**Files touched:** `AGENTS.md` (add rules summary), `.github/workflows/ci.yml` (add rule coverage check step).

**Acceptance criteria:** AGENTS.md references rules; CI enforces coverage.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule maintenance | Stale rules | CI check; regular audits |
| Coverage false positives | Topic keyword matching | Manual review |
| Rule conflicts | Single authoritative set |

## Verification

- Script: `node scripts/build-gap-inventory.mjs` → gap-inventory.md
- Script: `node scripts/check-rule-coverage.mjs` → all rules covered
- CI: rule check passes