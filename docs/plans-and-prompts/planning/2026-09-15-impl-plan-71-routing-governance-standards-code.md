# Implementation Plan 71 — Routing Governance & Standards — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #governance #standards #compliance #audit #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (master rules from plan 20 research; audit events from plan 47; CI setup from plan 32; routing logic in `src/sse/handlers/chat.js` + `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the standards check script; violate a standard and confirm the check fails; confirm compliance audit rows.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-71-routing-governance-standards.md`, `../research/9router/impl-plan-20-master-rules.md`, `../research/9router/impl-plan-47-audit-log-traceability.md`.

## Scope

**In scope:** routing standards document (policies, naming, conventions) + versioned evolution; standards checks (lint-style script + CI integration); review process (impact analysis template, approval workflow); compliance (policy enforcement, audit of routing decisions, periodic reports).
**Out of scope:** org-wide policy management UI; external compliance certifications.

## Milestones

### M1 — Routing standards doc + checks

**Reference code (`docs/routing-standards.md`):**

```md
# Routing Standards (v1)

## Policies
1. Every routing decision MUST record the model, provider, and reason (audit event).
2. Fallback chains MUST be finite and documented (max 3 fallbacks).
3. Cost-based routing MUST use the pricing registry (plan 69), never hardcoded prices.
4. Provider selection MUST respect diversity caps (plan 65) when enabled.
5. Sensitive request data MUST be redacted before logging (plan 54 patterns).

## Naming & conventions
- Model ids: lowercase, provider-prefixed (`openai/gpt-4o`).
- Combo ids: `combo-<purpose>-<n>`.
- Route reasons: one of `primary|fallback|diversity|quality|cost|manual`.

## Evolution
- Standards are versioned; changes require a review entry (M2).
```

**Reference code (`scripts/check-routing-standards.mjs`):**

```js
#!/usr/bin/env node
// Lint-style checks against the routing codebase. Exit non-zero on violations.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const checks = [];
const fail = (file, msg) => checks.push({ file, msg });

// 1. No hardcoded prices in routing code.
for (const dir of ["src/sse", "open-sse/handlers", "open-sse/executors"]) {
  for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(join(ROOT, dir, f), "utf8");
    if (/per\s*1\s*M|pricePer|costPer/.test(src) && !src.includes("pricing")) {
      fail(`${dir}/${f}`, "possible hardcoded pricing outside pricing registry");
    }
  }
}

// 2. Fallback chains bounded.
// (Heuristic: look for unbounded while loops around fallback selection.)

if (checks.length) {
  console.error("Routing standards violations:");
  for (const c of checks) console.error(`  - ${c.file}: ${c.msg}`);
  process.exit(1);
}
console.log("Routing standards: OK");
```

**Acceptance criteria:** standards doc exists; script flags violations; exits non-zero.

### M2 — Review process

**Reference code (`src/lib/governance/review.js`):**

```js
// Impact analysis for a routing change. Returns structured assessment.
export function assessRoutingChange({ files, description, affectedModels = [], affectedProviders = [] }) {
  const routingFiles = ["src/sse/handlers/chat.js", "open-sse/handlers/chatCore.js", "open-sse/executors", "open-sse/translator"];
  const touchesRouting = files.some((f) => routingFiles.some((r) => f.includes(r)));
  return {
    description,
    touchesRouting,
    affectedModels,
    affectedProviders,
    risk: touchesRouting ? (affectedModels.length > 10 ? "high" : "medium") : "low",
    requiresApproval: touchesRouting,
    checklist: [
      "Standards doc updated if behavior changes",
      "Audit events preserved",
      "Fallback chains still finite",
      "Pricing registry used (no hardcoded prices)",
    ],
  };
}
```

**Acceptance criteria:** impact assessment classifies risk; approval required for routing changes.

### M3 — Compliance audit

**Reference code (migration `src/lib/db/migrations/20260915-governance.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS governance_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      kind TEXT NOT NULL,          -- routing_decision | policy_change | review
      model TEXT,
      provider TEXT,
      reason TEXT,
      policy TEXT,
      compliant INTEGER NOT NULL DEFAULT 1,
      detail TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_governance_ts ON governance_events (ts);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS governance_events"); };
```

```js
// src/lib/db/repos/governanceRepo.js
export async function recordGovernanceEvent(db, ev) {
  db.run(`INSERT INTO governance_events (ts, kind, model, provider, reason, policy, compliant, detail)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [new Date().toISOString(), ev.kind, ev.model ?? null, ev.provider ?? null, ev.reason ?? null, ev.policy ?? null, ev.compliant ? 1 : 0, ev.detail ?? null]);
}
export async function complianceReport(db, { sinceIso } = {}) {
  const where = sinceIso ? "WHERE ts >= ?" : "";
  const params = sinceIso ? [sinceIso] : [];
  const rows = db.all(`SELECT kind, compliant, COUNT(*) AS n FROM governance_events ${where} GROUP BY kind, compliant`, params);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const violations = rows.filter((r) => !r.compliant).reduce((a, r) => a + r.n, 0);
  return { total, violations, rate: total ? Number(((total - violations) / total).toFixed(3)) : 1, breakdown: rows };
}
```

**Acceptance criteria:** routing decisions recorded; compliance report computes rate.

### M4 — Integration + tests

**Reference code (`src/lib/governance/compliance.js`):**

```js
import { recordGovernanceEvent } from "@/lib/db/repos/governanceRepo.js";

// Hook into routing: record every decision with its reason.
export function recordRoutingDecision({ model, provider, reason, policy = null, compliant = true, detail = null }) {
  const db = getAdapter();
  recordGovernanceEvent(db, { kind: "routing_decision", model, provider, reason, policy, compliant, detail });
}

// Policy check: reason must be one of the allowed set.
export const ALLOWED_REASONS = new Set(["primary", "fallback", "diversity", "quality", "cost", "manual"]);
export function checkReason(reason) {
  return ALLOWED_REASONS.has(reason);
}
```

**Files touched:** `docs/routing-standards.md` (new), `scripts/check-routing-standards.mjs` (new), `src/lib/governance/` (new: review, compliance), `src/lib/db/migrations/20260915-governance.js` (new), `src/lib/db/repos/governanceRepo.js` (new), CI workflow (standards check step), `tests/unit/governance.test.js` (new).

**Acceptance criteria:** decisions recorded with valid reasons; CI runs standards check; report available.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Standards bloat | Unenforceable rules | Minimal, checkable set |
| Review friction | Slow changes | Automation + templates |
| Compliance gaps | Missed violations | Audit + reports |
| Staleness | Outdated standards | Versioned + review on change |

## Verification

- Unit: assessRoutingChange, checkReason, complianceReport
- Manual: run check script; make a routing change → impact assessment; view report
- Regression: `tests/__baseline__/verify-no-regression.mjs`