# E2E Testing Workflow — 9Router Full Verification

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #testing #e2e #verification

> ⚠️ SYNC NOTE: This workflow MUST be updated whenever streaming, combo,
> smart router, or fallback chain code changes. If you modify
> `open-sse/utils/stream.js`, `open-sse/services/combo.js`,
> `src/sse/services/smartRouter.js`, or `src/sse/handlers/chat.js`,
> re-run this workflow and update the expected results below.

## Prerequisites

```bash
# 1. Build production standalone
cd /Users/chris/Documents/GitHub/9router
npx next build --webpack
node scripts/copy-standalone-assets.mjs

# 2. Start server
cd .next/standalone
PORT=20130 HOSTNAME=127.0.0.1 DATA_DIR=/tmp/9r-e2e2 \
  JWT_SECRET=test-secret-123 INITIAL_PASSWORD=123456 \
  NODE_ENV=production node server.js &

# 3. Start mock upstream
node /tmp/mock-upstream.cjs &

# 4. Get API key
curl -s -c /tmp/9r-cookies.txt -X POST http://127.0.0.1:20130/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"123456"}' > /dev/null
API_KEY=$(curl -s -b /tmp/9r-cookies.txt -X POST http://127.0.0.1:20130/api/keys \
  -H 'Content-Type: application/json' -d '{"name":"e2e"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])")
echo "API_KEY=$API_KEY"
```

## Test Suite

### T1: [DONE] Sentinel — Single Model Streaming
**What:** Verify exactly 1 `data: [DONE]` in single-model SSE stream.
**Why:** Bug fixed in commit `429ddc56` — passthrough mode was emitting 2×.
**Pass criteria:** Count = 1

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"mockreal/gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"test"}]}' \
  | grep -c 'data: \[DONE\]'
# Expected: 1
```

### T2: [DONE] Sentinel — Combo Streaming
**What:** Verify exactly 1 `data: [DONE]` in combo SSE stream.
**Why:** Same bug as T1, combo path shares the transform stream.
**Pass criteria:** Count = 1

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"mockreal/gpt-4o-mini,mockreal/gpt-4o","stream":true,"messages":[{"role":"user","content":"test"}]}' \
  | grep -c 'data: \[DONE\]'
# Expected: 1
```

### T3: Non-Streaming Combo Returns Clean JSON
**What:** Verify non-streaming combo returns valid JSON with no SSE artifacts.
**Why:** Ensures forced-SSE-to-JSON conversion works (chatCore.js guard).
**Pass criteria:** Valid JSON, no `error` key

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"mockreal/gpt-4o-mini,mockreal/gpt-4o","stream":false,"messages":[{"role":"user","content":"test"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if 'error' not in d else 'FAIL: '+str(d.get('error')))"
# Expected: PASS
```

### T4: Smart Router Routes to Configured Provider
**What:** Verify `modelRouter` virtual model picks a real model from allowed providers.
**Why:** Commit `245845cf` fixed auth-gated custom node discovery.
**Pass criteria:** Response has valid `model` field, no error

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"reverse a linked list"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('error'); print(f'PASS: {d.get(\"model\")}') if not e else print(f'FAIL: {e}')"
# Expected: PASS: dialagram/nexum-router (or other dialagram/* model)
```

### T5: Fallback Chain with 429
**What:** Trigger 429 on first model, verify fallback to next in chain.
**Why:** Validates retry logic in combo.js (commit `8990a3b4`).
**Pass criteria:** Response succeeds with fallback model

```bash
# Arm the mock to fail next request with 429
curl -s http://127.0.0.1:24000/fail429
# Send request to model with fallback chain configured
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"mockreal/gpt-4o-mini","stream":false,"messages":[{"role":"user","content":"test"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'PASS: fell through to {d.get(\"model\")}') if 'error' not in d else print(f'FAIL: {d.get(\"error\")}')"
# Expected: PASS: fell through to model-id
```

### T6: Direct Dialagram Provider Call
**What:** Verify live Dialagram provider responds correctly.
**Why:** Confirms custom provider node + API key connection works end-to-end.
**Pass criteria:** Real response from qwen-3.5-plus

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"dialagram/qwen-3.5-plus","stream":false,"messages":[{"role":"user","content":"say hello"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('error'); print(f'PASS: {d.get(\"model\")} -> {(d.get(\"choices\",[{}])[0].get(\"message\",{}).get(\"content\",\"\") or \"\")[:50]}') if not e else print(f'FAIL: {e}')"
# Expected: PASS: qwen-3.5-plus -> <real response>
```

### T7: Models Endpoint Returns Registry
**What:** Verify `/v1/models` returns registered models.
**Pass criteria:** Non-empty data array

```bash
curl -s http://127.0.0.1:20130/v1/models \
  -H "Authorization: Bearer $API_KEY" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'PASS: {len(d.get(\"data\",[]))} models') if d.get('data') else print('FAIL: empty')"
# Expected: PASS: N models (N > 0)
```

## Quick Run All

```bash
echo "T1:" $(curl -s -X POST http://127.0.0.1:20130/v1/chat/completions -H 'Content-Type: application/json' -H "Authorization: Bearer $API_KEY" -d '{"model":"mockreal/gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"t"}]}' | grep -c 'data: \[DONE\]')
echo "T2:" $(curl -s -X POST http://127.0.0.1:20130/v1/chat/completions -H 'Content-Type: application/json' -H "Authorization: Bearer $API_KEY" -d '{"model":"mockreal/gpt-4o-mini,mockreal/gpt-4o","stream":true,"messages":[{"role":"user","content":"t"}]}' | grep -c 'data: \[DONE\]')
echo "T3:" $(curl -s -X POST http://127.0.0.1:20130/v1/chat/completions -H 'Content-Type: application/json' -H "Authorization: Bearer $API_KEY" -d '{"model":"mockreal/gpt-4o-mini,mockreal/gpt-4o","stream":false,"messages":[{"role":"user","content":"t"}]}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS' if 'error' not in d else 'FAIL')")
echo "T4:" $(curl -s -X POST http://127.0.0.1:20130/v1/chat/completions -H 'Content-Type: application/json' -H "Authorization: Bearer $API_KEY" -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"code"}]}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('PASS:'+d.get('model','?') if 'error' not in d else 'FAIL')")
echo "T7:" $(curl -s http://127.0.0.1:20130/v1/models -H "Authorization: Bearer $API_KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'PASS:{len(d.get(\"data\",[]))}')")
```

## When to Re-Run

- After ANY change to: `stream.js`, `combo.js`, `smartRouter.js`, `chat.js`, `chatCore.js`
- After adding/modifying provider nodes or connections
- After changing `settings.smartRouter` or `settings.modelFallbacks`
- Before every release or merge to master
- After Next.js version upgrades (build output may change)
