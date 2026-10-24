# Implementation Plan 46 — Prompt Templates & Optimization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #prompt-templates #versioning #ab-testing #optimization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (system prompt handling in `src/sse/handlers/chat.js`; settings via `src/lib/db/repos/settingsRepo.js`; the `skills/` directory which already ships prompt-like skill definitions; translator pivot-through-OpenAI design).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — create a template with variables, resolve it in a live request, run an A/B assignment, check the optimization report.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-46-prompt-templates-optimization.md`, `../research/9router/impl-plan-36-comparison.md`, `../research/9router/impl-plan-26-token-optimization.md`.

## Scope

**In scope:** versioned template store (name, version, content, variables); `{{var}}` substitution with validation; template CRUD via API + dashboard; A/B testing (per-request/per-user variant assignment, outcome tracking); optimization reports (token length, structure checks).
**Out of scope:** auto-rewriting prompts with LLMs; prompt marketplace.

## Milestones

### M1 — Template model + registry

**Reference code (migration `src/lib/db/migrations/20260915-templates.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS prompt_template_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
};
export const down = (db) => {
  db.exec("DROP TABLE IF EXISTS prompt_template_versions");
  db.exec("DROP TABLE IF EXISTS prompt_templates");
};
```

```js
// src/lib/db/repos/templateRepo.js
export async function createTemplate(db, { name, content, variables = [] }) {
  db.run("INSERT INTO prompt_templates (name, content, variables_json) VALUES (?, ?, ?)",
    [name, content, JSON.stringify(variables)]);
  const row = db.get("SELECT * FROM prompt_templates WHERE name = ?", [name]);
  db.run("INSERT INTO prompt_template_versions (template_id, version, content) VALUES (?, 1, ?)",
    [row.id, content]);
  return row;
}

export async function updateTemplate(db, { id, content, variables }) {
  const cur = db.get("SELECT * FROM prompt_templates WHERE id = ?", [id]);
  if (!cur) return null;
  const nextVersion = cur.version + 1;
  db.run("UPDATE prompt_templates SET content = ?, variables_json = ?, version = ?, updated_at = datetime('now') WHERE id = ?",
    [content, JSON.stringify(variables ?? []), nextVersion, id]);
  db.run("INSERT INTO prompt_template_versions (template_id, version, content) VALUES (?, ?, ?)",
    [id, nextVersion, content]);
  return { id, version: nextVersion };
}

export async function listTemplates(db) {
  return db.all("SELECT id, name, version, active, updated_at FROM prompt_templates ORDER BY name");
}
```

**Acceptance criteria:** templates created with version 1; updates bump version + snapshot history; list works.

### M2 — Variable substitution + validation

**Reference code (`src/lib/templates/resolve.js`):**

```js
// Resolve {{var}} placeholders. Unknown variables → error (strict) or empty (lenient).
export function resolveTemplate(content, variables, { strict = true } = {}) {
  const missing = [];
  const out = content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name) => {
    if (variables[name] === undefined) { missing.push(name); return strict ? match : ""; }
    return String(variables[name]);
  });
  if (strict && missing.length) {
    const err = new Error(`Missing template variables: ${missing.join(", ")}`);
    err.code = "MISSING_TEMPLATE_VARS";
    err.missing = missing;
    throw err;
  }
  return out;
}

// Validate a template's declared variables against its content.
export function validateTemplate(content, declared = []) {
  const used = [...new Set([...content.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]))];
  const undeclared = used.filter((v) => !declared.includes(v));
  const unused = declared.filter((v) => !used.includes(v));
  return { used, undeclared, unused, ok: undeclared.length === 0 };
}
```

**Acceptance criteria:** substitution works; strict mode throws with missing list; validation flags undeclared/unused vars.

### M3 — A/B testing

**Reference code (`src/lib/templates/abtest.js`):**

```js
// Deterministic variant assignment: stable per (templateId, userId) via hash.
export function assignVariant(templateId, userId, variants, salt = "abtest") {
  if (!variants?.length) return null;
  const h = hash(`${templateId}:${userId ?? "anon"}:${salt}`);
  return variants[h % variants.length];
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

// Outcome tracking: record quality/cost/latency per variant.
export async function recordOutcome(db, { templateId, variantId, ok, latencyMs, cost, tokens }) {
  db.run(`
    INSERT INTO template_ab_stats (template_id, variant_id, attempts, failures, total_latency_ms, total_cost, total_tokens)
    VALUES (?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(template_id, variant_id) DO UPDATE SET
      attempts = attempts + 1,
      failures = failures + excluded.failures,
      total_latency_ms = total_latency_ms + excluded.total_latency_ms,
      total_cost = total_cost + excluded.total_cost,
      total_tokens = total_tokens + excluded.total_tokens
  `, [templateId, variantId, ok ? 0 : 1, latencyMs ?? 0, cost ?? 0, tokens ?? 0]);
}
```

**Acceptance criteria:** assignment stable per user; outcomes recorded; comparison query available.

### M4 — Optimization reports + API + tests

**Reference code (`src/lib/templates/optimize.js`):**

```js
// Token-length estimate (chars/4 heuristic) + structure checks.
export function analyzeTemplate(content) {
  const estTokens = Math.ceil(content.length / 4);
  const checks = [];
  if (content.length > 4000) checks.push({ level: "warn", msg: `Long template (~${estTokens} tokens) — consider shortening` });
  if (!content.includes("{{")) checks.push({ level: "info", msg: "No variables used — consider templating" });
  if (/\b(you are|you're)\b/i.test(content)) checks.push({ level: "info", msg: "Role statement present" });
  const sections = content.split(/\n{2,}/).length;
  if (sections < 2) checks.push({ level: "info", msg: "Single block — consider structuring with sections" });
  return { estTokens, checks };
}
```

**Files touched:** `src/lib/templates/` (new: resolve, abtest, optimize), `src/lib/db/migrations/20260915-templates.js` (new), `src/lib/db/repos/templateRepo.js` (new), `src/sse/handlers/chat.js` (template resolution), `src/app/api/v1/templates/route.js` (new), dashboard templates page (new), `tests/unit/templates.test.js` (new).

**Acceptance criteria:** analysis report per template; API CRUD works; dashboard functional.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Variable injection | Bad prompts | Validation + strict mode |
| A/B noise | Wrong conclusions | Stable assignment + sample tracking |
| Version confusion | Wrong template used | Explicit version pinning |
| Optimization bias | Subjective checks | Data-driven + heuristic-only |

## Verification

- Unit: resolve, validate, assign, analyze
- Manual: template CRUD in dashboard; live request uses resolved template
- Regression: `tests/__baseline__/verify-no-regression.mjs`