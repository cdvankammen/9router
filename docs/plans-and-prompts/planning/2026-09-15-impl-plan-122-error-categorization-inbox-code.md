# Implementation Plan 122 — Error Categorization & Error Inbox — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #errors #inbox #triage #categorization #registry #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (SQLite repos in `src/lib/db/repos/*` exported from `src/lib/db/index.js`; logging in `src/lib/logging/`; error taxonomy from plan 89 (`open-sse/errors/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — categorize errors; inbox dedup; triage workflow.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-122-error-categorization-inbox.md`, `../research/9router/impl-plan-89-error-classification-retry.md`, `../research/9router/impl-plan-19-unified-error-system.md`.

## Scope

**In scope:** error categorization (categories provider/network/auth/quota/rate-limit/timeout/malformed/internal, classifier + registry, confidence); error inbox (events with status new/triaged/fixed/ignored, priorities severity × frequency × impact, triage/assign/resolve workflows, dedup); error registry (programmatic definitions, lookup, extension); logging integration + dashboard error inbox.
**Out of scope:** unified error system internals (plan 19); retry semantics (plan 89).

## Milestones

### M1 — Error categorization

**Reference code (`src/lib/errorinbox/categorize.js`):**

```js
// Categories.
export const ERROR_CATEGORIES = ["provider", "network", "auth", "quota", "rate-limit", "timeout", "malformed", "internal"];

// Classifier: keyword-based with confidence.
export const CATEGORY_PATTERNS = {
  auth: [/401|403|unauthorized|invalid api key|authentication/i],
  quota: [/insufficient_quota|quota|billing|payment required/i],
  "rate-limit": [/429|rate.?limit|too many requests/i],
  timeout: [/timeout|timed out|deadline exceeded/i],
  network: [/econnrefused|econnreset|enetunreach|fetch failed|dns/i],
  malformed: [/unexpected token|parse error|invalid json|malformed/i],
  provider: [/upstream|provider error|5\d\d/i],
};

export function categorizeError(err, { patterns = CATEGORY_PATTERNS } = {}) {
  const text = `${err?.message ?? ""} ${err?.status ?? ""} ${err?.code ?? ""}`;
  const hits = Object.entries(patterns)
    .filter(([, res]) => res.some((re) => re.test(text)))
    .map(([cat]) => cat);
  if (!hits.length) return { category: "internal", confidence: 0.5 };
  return { category: hits[0], confidence: Math.min(0.95, 0.5 + hits.length * 0.15) };
}
```

**Acceptance criteria:** categories; classifier; confidence.

### M2 — Error inbox

**Reference code (`src/lib/errorinbox/inbox.js`):**

```js
// Inbox model: statuses + priorities.
export const INBOX_STATUS = ["new", "triaged", "fixed", "ignored"];

export function makeInbox() {
  const events = new Map(); // id -> event
  return {
    add(evt) {
      const key = `${evt.category}:${evt.message?.slice(0, 80)}`;
      const existing = [...events.values()].find((e) => e.dedupKey === key);
      if (existing) { existing.count += 1; return { ok: true, deduped: true, id: existing.id }; } // dedup
      const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      events.set(id, { id, dedupKey: key, count: 1, status: "new", ...evt });
      return { ok: true, deduped: false, id };
    },
    // Priority: severity × frequency × impact.
    priority(id) {
      const e = events.get(id);
      if (!e) return 0;
      const sev = { low: 1, medium: 2, high: 3, critical: 4 }[e.severity ?? "medium"] ?? 2;
      return sev * Math.log2(1 + (e.count ?? 1)) * (e.impact ?? 1);
    },
    setStatus(id, status) {
      if (!INBOX_STATUS.includes(status)) return { ok: false, reason: "invalid-status" };
      const e = events.get(id); if (!e) return { ok: false, reason: "not-found" };
      e.status = status; return { ok: true, event: e };
    },
    byStatus(status) { return [...events.values()].filter((e) => e.status === status).sort((a, b) => this.priority(b.id) - this.priority(a.id)); },
    all() { return [...events.values()]; },
  };
}
```

**Acceptance criteria:** dedup; priorities; status workflows.

### M3 — Error registry

**Reference code (`src/lib/errorinbox/registry.js`):**

```js
// Registry: programmatic error definitions.
export function makeErrorRegistry() {
  const defs = new Map(); // code -> definition
  return {
    define(def) { defs.set(def.code, def); return def; },
    lookup(err) {
      const code = err?.code ?? err?.status ?? null;
      if (code && defs.has(code)) return { ...defs.get(code), matched: "code" };
      const cat = categorizeError(err);
      const byCat = [...defs.values()].find((d) => d.category === cat.category);
      return byCat ? { ...byCat, matched: "category" } : null;
    },
    // Extension: custom definitions.
    extend(defsToAdd) { for (const d of defsToAdd) this.define(d); },
    all() { return [...defs.values()]; },
  };
}
```

**Acceptance criteria:** definitions; lookup; extension.

### M4 — Triage + integration + tests

**Reference code (`src/lib/errorinbox/triage.js`):**

```js
// Triage workflows: assign + resolve.
export function triage(inbox, id, { assignee = null } = {}) {
  const r = inbox.setStatus(id, "triaged");
  if (r.ok && assignee) r.event.assignee = assignee;
  return r;
}

export function resolve(inbox, id, { resolution = null } = {}) {
  const r = inbox.setStatus(id, "fixed");
  if (r.ok) r.event.resolution = resolution;
  return r;
}

// Logging integration: errors flow to inbox.
export function inboxFromLog(logEntry, { inbox, categorize = categorizeError } = {}) {
  const cat = categorize(logEntry.error);
  return inbox.add({ category: cat.category, confidence: cat.confidence, message: logEntry.error?.message ?? String(logEntry.error), severity: logEntry.severity ?? "medium", at: logEntry.at ?? Date.now() });
}

// Telemetry: error metrics.
export function makeErrorTelemetry(inbox) {
  return {
    report() {
      const all = inbox.all();
      return {
        total: all.length,
        byStatus: Object.fromEntries(INBOX_STATUS.map((s) => [s, inbox.byStatus(s).length])),
        byCategory: all.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Files touched:** `src/lib/errorinbox/` (new: categorize, inbox, registry, triage), `src/lib/db/repos/errorInboxRepo.js` (new), `src/lib/logging/` (integration), dashboard error-inbox page (new), `tests/unit/errorinbox.test.js` (new).

**Acceptance criteria:** triage; logging integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Inbox noise | Event flood | Dedup + priorities |
| Misclassification | Wrong category | Confidence + review |
| Triage staleness | Old errors | SLA reminders |
| Registry drift | Stale defs | Review cadence |

## Verification

- Unit: categorizeError, makeInbox, makeErrorRegistry, triage, resolve, inboxFromLog
- Manual: trigger error → inbox entry; dedup repeated; triage → fix
- Regression: `tests/__baseline__/verify-no-regression.mjs`