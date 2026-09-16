# Implementation Plan 19 — Unified Error System v2 — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #error-system #error-codes #envelope #centralized-handling #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/handlers/chatCore.js`, `open-sse/executors/default.js`, `open-sse/config/errorCodes.js` from plan 09).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-19-unified-error-system.md`, `../research/9router/29-unified-error-system-v2.md`
>
> **Note on overlap with plan 09:** plan 09 covers the *taxonomy + cooldown/circuit-breaker* mechanics. This plan covers the *error code registry + envelope format + centralized handling*. They compose together.

## Scope

**In scope:** error code format `CATEGORY.SUBCATEGORY`; error envelope `{error: {code, message, details, retryable, request_id}}`; centralized error handling in chatCore; error diagnostics API; error inbox dashboard.
**Out of scope:** taxonomy (plan 09); circuit breakers (plan 09).

## Milestones

### M1 — Error code registry

**Reference code (`open-sse/config/errorCodes.js` — extends plan 09):**

```js
// Full error code registry with mapping tables.
export const ERROR_CODES = {
  "RATE_LIMIT.UPSTREAM_429": { category: "rate_limit", retryable: true, http: 429 },
  "RATE_LIMIT.LOCAL_EXCEEDED": { category: "rate_limit", retryable: false, http: 429 },
  "AUTH.INVALID_KEY": { category: "auth", retryable: false, http: 401 },
  "AUTH.TOKEN_EXPIRED": { category: "auth", retryable: true, http: 401 },
  "BILLING.INSUFFICIENT": { category: "billing", retryable: false, http: 402 },
  "TIMEOUT.UPSTREAM": { category: "timeout", retryable: true, http: 504 },
  "TIMEOUT.GATEWAY": { category: "timeout", retryable: false, http: 504 },
  "CONTEXT_WINDOW.EXCEEDED": { category: "context_window", retryable: false, http: 400 },
  "CONTEXT_WINDOW.APPROACHING": { category: "context_window", retryable: false, http: 200 },
  "CONTENT_POLICY.VIOLATION": { category: "content_policy", retryable: false, http: 400 },
  "NETWORK.UNREACHABLE": { category: "network", retryable: true, http: 502 },
  "NETWORK.DNS_FAILURE": { category: "network", retryable: true, http: 502 },
  "SERVER.UPSTREAM_5XX": { category: "server", retryable: true, http: 500 },
  "SERVER.INTERNAL": { category: "server", retryable: false, http: 500 },
  "UNKNOWN.ERROR": { category: "unknown", retryable: false, http: 500 },
};

export function codeForStatus(status, detail) {
  if (status === 429) return "RATE_LIMIT.UPSTREAM_429";
  if (status === 401 || status === 403) return "AUTH.INVALID_KEY";
  if (status === 402) return "BILLING.INSUFFICIENT";
  if (status === 408 || status === 504) return "TIMEOUT.UPSTREAM";
  if (detail?.code === "context_length_exceeded") return "CONTEXT_WINDOW.EXCEEDED";
  if (status >= 500) return "SERVER.UPSTREAM_5XX";
  return "UNKNOWN.ERROR";
}
```

**Acceptance codes:** registry is single source of truth; `codeForStatus` mapping works.

### M2 — Error envelope + centralized handling

**Reference code (`open-sse/config/errorEnvelope.js`):**

```js
export function errorEnvelope(code, requestId, { message, details = {}, http: httpStatus } = {}) {
  const def = ERROR_CODES[code] ?? ERROR_CODES["UNKNOWN.ERROR"];
  return {
    error: {
      code,
      message: message ?? def.category,
      details,
      retryable: def.retryable,
      request_id: requestId,
    },
  };
}

// Centralized: all error paths in chatCore use this.
export function toClientResponse(code, requestId, extra) {
  const envelope = errorEnvelope(code, requestId, extra);
  return new Response(JSON.stringify(envelope), {
    status: extra?.http ?? ERROR_CODES[code]?.http ?? 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Wiring in `chatCore.js`:**

```js
// Replace ad-hoc error responses with:
return toClientResponse(codeForStatus(err.status, err), requestId, {
  message: err.message,
  details: { provider: err.provider, model: err.model },
});
```

**Acceptance criteria:** all error paths use envelope; client receives structured `{error}` object.

### M3 — Error diagnostics API + dashboard

**Reference code (`src/app/api/v1/errors/route.js`):**

```js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const { code, provider, model, start, end } = Object.fromEntries(searchParams);
  const where = [];
  const params = [];
  if (code) { where.push("error_code = ?"); params.push(code); }
  if (provider) { where.push("provider = ?"); params.push(provider); }
  if (model) { where.push("model = ?"); params.push(model); }
  if (start) { where.push("timestamp >= ?"); params.push(Number(start)); }
  if (end) { where.push("timestamp <= ?"); params.push(Number(end)); }
  const sql = `SELECT error_code, COUNT(*) as count, MAX(timestamp) as last_seen FROM errors
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    GROUP BY error_code ORDER BY count DESC`;
  const rows = await db.all(sql, ...params);
  return Response.json({ errors: rows });
}
```

**Files touched:** error-inbox dashboard (grouped by code/provider, drill-down, retry action, error rate charts).

**Acceptance criteria:** diagnostics API; dashboard error inbox with grouping and drill-down.

### M4 — Tests

**Files touched:** `tests/unit/error-codes.test.js` (new).

**Acceptance criteria:** registry completeness, envelope format, centralized handling tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Migration from ad-hoc errors | Incremental replacement |
| Error message PII | Redact details in storage |
| Registry gaps | Catch-all "UNKNOWN.ERROR" |

## Verification

- Unit: error codes, envelope, centralized handling
- Manual: trigger various errors → verify structured response
- Regression: `tests/__baseline__/verify-no-regression.mjs`