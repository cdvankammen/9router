# Implementation Plan 35 — Data Privacy & Compliance — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #privacy #compliance #redaction #retention #gdpr #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/usageDb.js`, `src/lib/db/` conventions, `src/lib/security/redaction.js` from plan 10, settings shape).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, check redaction/retention, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-35-data-privacy-compliance.md`, `../research/9router/35-master-coding-rules.md` (privacy rules tie-in)

## Scope

**In scope:** redaction layer (emails, phones, API keys, IPs, credit cards; modes off/redact/hash/block; coverage logs/usage/traces/errors); retention policies per data type + scheduled cleanup; privacy modes (no-log/redact/full, per-key or global); data inventory + export + deletion + audit.
**Out of scope:** legal advice; certification (SOC 2 etc.).

## Milestones

### M1 — Redaction layer

**Reference code (`src/lib/privacy/redaction.js` — extends plan 10):**

```js
// Modes: off | redact | hash | block
export const REDACTION_MODES = ["off", "redact", "hash", "block"];

const PATTERNS = [
  { name: "email", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "phone", re: /\+?[\d\s-]{10,15}/g },
  { name: "api_key", re: /sk-[a-zA-Z0-9]{20,}/g },
  { name: "ip", re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { name: "credit_card", re: /\b(?:\d[ -]*?){13,16}\b/g },
];

export function redactText(text, { mode = "redact" } = {}) {
  if (mode === "off") return text;
  let out = String(text ?? "");
  for (const { name, re } of PATTERNS) {
    out = out.replace(re, (match) => {
      switch (mode) {
        case "redact": return `[${name}]`;
        case "hash": return `[${name}:${hashShort(match)}]`;
        case "block": return `[blocked:${name}]`;
        default: return match;
      }
    });
  }
  return out;
}

function hashShort(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

// Coverage: apply at log/usage/trace/error write points.
export function redactForStorage(data, { mode = "redact" } = {}) {
  if (typeof data === "string") return redactText(data, { mode });
  if (Array.isArray(data)) return data.map((d) => redactForStorage(d, { mode }));
  if (data && typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = /authorization|api_key|token|password|secret/i.test(k) ? "[REDACTED]" : redactForStorage(v, { mode });
    }
    return out;
  }
  return data;
}
```

**Acceptance criteria:** all PII types covered; modes work; applied at write points.

### M2 — Retention policies

**Reference code (`src/lib/privacy/retention.js`):**

```js
// Retention per data type; scheduled cleanup.
export const RETENTION_POLICIES = {
  usage: { keepDays: 90, action: "delete" },
  logs: { keepDays: 30, action: "delete" },
  traces: { keepDays: 14, action: "delete" },
  errors: { keepDays: 90, action: "delete" },
  conversations: { keepDays: 180, action: "delete" },
};

export async function runRetentionCleanup(db, { now = Date.now() } = {}) {
  const results = {};
  for (const [type, policy] of Object.entries(RETENTION_POLICIES)) {
    const cutoff = now - policy.keepDays * 86_400_000;
    const table = retentionTable(type);
    const res = await db.run(`DELETE FROM ${table} WHERE timestamp < ?`, [cutoff]);
    results[type] = res.changes ?? 0;
  }
  return results;
}

function retentionTable(type) {
  return { usage: "usage_history", logs: "request_logs", traces: "routing_decisions", errors: "errors", conversations: "conversations" }[type];
}
```

**Acceptance criteria:** policies defined; cleanup runs on schedule; configurable.

### M3 — Privacy modes + data inventory

**Reference code (`src/lib/privacy/modes.js`):**

```js
// Modes: no-log | redact | full. Per-key or global.
export const PRIVACY_MODES = ["no-log", "redact", "full"];

export function effectivePrivacyMode(settings, apiKey) {
  if (settings.privacy?.perKey?.[apiKey]) return settings.privacy.perKey[apiKey];
  return settings.privacy?.global ?? "redact";
}

// Data inventory: what data exists, where, retention.
export async function dataInventory(db) {
  const tables = ["usage_history", "request_logs", "routing_decisions", "errors", "conversations", "response_cache"];
  const inventory = [];
  for (const table of tables) {
    const row = await db.get(`SELECT COUNT(*) as count, MAX(timestamp) as newest FROM ${table}`);
    inventory.push({ table, count: row.count, newest: row.newest });
  }
  return inventory;
}
```

**Acceptance criteria:** modes enforced per-key/global; inventory lists data.

### M4 — Export/deletion/audit + tests

**Reference code (`src/app/api/v1/privacy/route.js`):**

```js
export async function GET() {
  const inventory = await dataInventory(db);
  return Response.json({ inventory });
}

export async function POST(req) {
  const { action, scope } = await req.json();
  if (action === "export") {
    const data = await exportUserData(scope);
    return Response.json({ data });
  }
  if (action === "delete") {
    const deleted = await deleteUserData(scope);
    await logAuditEvent({ type: "privacy.delete", actor: "user", detail: { scope, deleted } });
    return Response.json({ deleted });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}
```

**Files touched:** dashboard privacy page (modes, inventory, export/delete buttons, audit log), `tests/unit/privacy.test.js` (new).

**Acceptance criteria:** export/delete work; audit logged; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Redaction false positives | Conservative patterns; review |
| Retention data loss | Configurable; warnings |
| Export size | Pagination |

## Verification

- Unit: redaction modes, retention, modes, inventory
- Manual: set privacy mode → verify redaction in logs
- Regression: `tests/__baseline__/verify-no-regression.mjs`