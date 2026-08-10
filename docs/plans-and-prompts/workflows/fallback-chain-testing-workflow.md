# Fallback Chain Testing Workflow

**Date:** 2026-08-10
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #testing #fallback #combo #retry

> ⚠️ SYNC NOTE: Update whenever combo fallback, retry, or error-classification
> code changes. If you modify `open-sse/services/combo.js`,
> `open-sse/handlers/chatCore.js`, `open-sse/config/errorConfig.js`, or
> `open-sse/utils/errorCategorizer.js`, re-run this workflow and update
> expected results.

## Prerequisites

```bash
# 1. Build production standalone
cd /Users/chris/Documents/GitHub/9router
npx next build --webpack
node scripts/copy-standalone-assets.mjs

# 2. Start server + mock upstream (supports /fail429, /fail500)
cd .next/standalone
PORT=20130 HOSTNAME=127.0.0.1 DATA_DIR=/tmp/9r-e2e2 \
  JWT_SECRET=test-secret-123 INITIAL_PASSWORD=123456 \
  NODE_ENV=production node server.js &
node /tmp/mock-upstream.cjs &

# 3. Get API key (see e2e-testing-workflow.md for the exact curl)
API_KEY=...
```

## Test Cases

### T1: Retry Loop — 429 Rate Limit
**What:** Configure a combo with a primary that returns 429; verify retry with
backoff then fallback.
**Why:** Error classification (`rate_limit`) must trigger retry/cooldown, not
immediate failure.
**Pass criteria:** Request eventually succeeds via fallback; retry count logged.

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"combo-name","messages":[{"role":"user","content":"test"}]}'
# mock: curl -s -X POST http://localhost:24000/fail429
```

### T2: 500 Fallback
**What:** Primary returns 500; verify fallback to next model in combo.
**Why:** `overloaded`/`invalid_request` classification must route to fallback.
**Pass criteria:** Request succeeds via fallback model.

### T3: Per-Model Overrides
**What:** Combo with per-model overrides (temperature, max_tokens); verify
override applied to each model.
**Why:** Overrides must apply per-model, not globally.
**Pass criteria:** Upstream receives the override values.

### T4: All-Fail Error
**What:** All models in combo fail; verify structured error returned.
**Why:** Client must receive a clear error, not a hang.
**Pass criteria:** Error response with provider/model info + fallback trace.

### T5: Multi-Account Rotation
**What:** Combo with multiple accounts for one provider; verify rotation on
failure.
**Why:** Account-level fallback must rotate credentials.
**Pass criteria:** Second account used after first fails.

## When to Re-Run

- `open-sse/services/combo.js` changed
- `open-sse/handlers/chatCore.js` changed (retry/refresh paths)
- `open-sse/config/errorConfig.js` changed (cooldown/backoff)
- `open-sse/utils/errorCategorizer.js` changed (category taxonomy)
- `src/app/(dashboard)/dashboard/combos/**` changed (UI)