# Webhook Implementation Plan — HTTP Client Stack (R47–R48)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r47 #r48 #http-client #timeout #retry

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions (proxyAwareFetch), but the
> agent is the final arbiter of implementation quality.

---

## Objective

Implement the HTTP client stack (R47–R48): a shared outbound HTTP client with timeout, retry, backoff, and jitter semantics for ALL webhook deliveries and actions. This is the foundation every outbound call (worker delivery, notify, http action, uptime-kuma, healthchecks) should use.

## Scope

**In scope:**
- `webhookFetch` wrapper: timeout + retry + backoff + jitter
- Retry policy: maxRetries, baseDelayMs, maxDelayMs, jitter
- Retryable statuses: 408, 429, 5xx (not 4xx except 408/429)
- Timeout: connect + response (AbortSignal.timeout)
- Uses `proxyAwareFetch` underneath (proxy support preserved)

**Out of scope (v1):**
- Circuit breaker (v2)
- Per-host concurrency limits

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/http.js` | new | webhookFetch wrapper |
| `src/lib/webhooks/worker.js` | edit | Use webhookFetch for delivery |
| `src/lib/webhooks/actions/*.js` | edit | Use webhookFetch for actions |

## Code

### 1. `src/lib/webhooks/http.js`

```js
// src/lib/webhooks/http.js
// Shared outbound HTTP client: timeout + retry + backoff + jitter.
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Fetch with timeout, retry, exponential backoff + jitter.
 * @param {string} url
 * @param {object} options - fetch options
 * @param {{maxRetries?: number, baseDelayMs?: number, maxDelayMs?: number, timeoutMs?: number}} [policy]
 * @returns {Promise<Response>}
 */
export async function webhookFetch(url, options = {}, policy = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    timeoutMs = 10_000,
  } = policy;

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await proxyAwareFetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
      lastErr = new Error(`retryable status ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (err?.name === "AbortError" && attempt >= maxRetries) break;
    }
    if (attempt < maxRetries) {
      // Exponential backoff with full jitter
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jittered = Math.floor(delay * Math.random());
      await new Promise((r) => setTimeout(r, jittered));
    }
  }
  throw lastErr || new Error(`fetch failed after ${maxRetries + 1} attempts`);
}

/**
 * Convenience: POST JSON with retry policy.
 * @param {string} url
 * @param {object} body
 * @param {object} [policy]
 */
export async function webhookPostJson(url, body, policy) {
  return webhookFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    policy
  );
}
```

### 2. `src/lib/webhooks/worker.js` — use webhookFetch (edit)

```js
// In the delivery function, replace proxyAwareFetch with webhookFetch:
import { webhookFetch } from "./http.js";

const res = await webhookFetch(webhook.url, {
  method: "POST",
  headers: signed.headers,
  body: rawBody,
}, { maxRetries: 3, timeoutMs: 10_000 });
```

### 3. `src/lib/webhooks/actions/*.js` — use webhookFetch (edit)

```js
// In notify/http actions, replace proxyAwareFetch with webhookFetch:
import { webhookFetch } from "../http.js";
// ... same calls, with retry policy
```

## Acceptance Criteria

- [ ] Timeout via AbortSignal.timeout (connect + response)
- [ ] Retry on 408/429/5xx with exponential backoff + full jitter
- [ ] Non-retryable 4xx returned immediately
- [ ] All outbound webhook calls use webhookFetch

## Testing

```bash
# Unit test (tests/unit/webhook-http.test.js)
# - retryable status → retries then succeeds
# - non-retryable 4xx → immediate return
# - timeout → AbortError after maxRetries
# - backoff delays grow exponentially (with jitter bounds)
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-11-http-client-architecture.md` (R47–R48)
- Plan: `../planning/2026-09-15-webhook-m2-outbox-worker-plan.md` (worker)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`