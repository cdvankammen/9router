# Dialagram Setup Testing Workflow

**Date:** 2026-08-10
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #testing #dialagram #provider #smart-router

> ⚠️ SYNC NOTE: Update whenever Dialagram provider config, smart-router
> integration, or provider-node validation changes. If you modify
> `src/app/api/providers/[id]/models/route.js`,
> `src/sse/services/smartRouter.js`, or `open-sse/providers/registry/*`,
> re-run this workflow and update expected results.

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

# 3. Get API key
curl -s -c /tmp/9r-cookies.txt -X POST http://127.0.0.1:20130/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"123456"}' > /dev/null
API_KEY=$(curl -s -b /tmp/9r-cookies.txt -X POST http://127.0.0.1:20130/api/keys \
  -H 'Content-Type: application/json' -d '{"name":"dialagram-e2e"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])")
echo "API_KEY=$API_KEY"
```

## Test Cases

### T1: Provider Node Creation (openai-compatible)
**What:** Create a Dialagram provider node via the providers API.
**Why:** Dialagram is an OpenAI-compatible router — the node must be
`openai-compatible` type with base URL `https://dialagram.me/router/v1`.
**Pass criteria:** Node created; appears in `/api/provider-nodes`.

```bash
curl -s -X POST http://127.0.0.1:20130/api/provider-nodes \
  -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"dialagram","type":"openai-compatible","baseUrl":"https://dialagram.me/router/v1","apiKey":"dgr_live_..."}'
```

### T2: Model Auto-Discovery
**What:** Fetch `/models` through the node validation endpoint.
**Why:** Dialagram supports `/models` listing — auto-discovery must populate
`dialagram/<model-id>` entries.
**Pass criteria:** Models listed with `dialagram/` prefix.

```bash
curl -s http://127.0.0.1:20130/api/providers/dialagram/models \
  -H "Authorization: Bearer $API_KEY"
```

### T3: Smart Router Integration
**What:** Include `dialagram/*` in smart-router `allowedModels` and route a
request through it.
**Why:** Smart router must classify + route to Dialagram models when allowed.
**Pass criteria:** Request succeeds; response model is `dialagram/<model>`.

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"dialagram/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

### T4: Fallback to Dialagram
**What:** Configure Dialagram as a fallback provider in a combo; fail the
primary and verify fallback.
**Why:** Dialagram is a router — it can serve as fallback upstream.
**Pass criteria:** Primary fails → request routed to Dialagram.

## When to Re-Run

- `src/app/api/providers/[id]/models/route.js` changed
- `src/sse/services/smartRouter.js` changed
- `open-sse/providers/registry/*` changed (provider config)
- Dialagram upstream endpoint/API changes