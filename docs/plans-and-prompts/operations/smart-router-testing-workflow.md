# Smart Router Testing Workflow

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #testing #smart-router #modelRouter

> ⚠️ SYNC NOTE: This workflow MUST be updated whenever smart router code
> changes. If you modify `src/sse/services/smartRouter.js`,
> `open-sse/services/smartRouter.js`, or `src/sse/handlers/chat.js`
> interception logic, re-run all tests below.

## Overview

The smart router is a virtual model (default name: `modelRouter`) that:
1. Classifies the user's task from message content
2. Scores available models by capability fit + cost/quality tradeoff
3. Creates/reuses a dynamic combo (`sr-<name>-<taskType>`)
4. Routes through the existing combo fallback engine

Configured via `settings.smartRouter`:
- `enabled`: toggle on/off
- `names`: trigger model names (default: `["modelRouter"]`)
- `allowedProviders`: restrict to specific provider IDs
- `allowedModels`: restrict to patterns (`dialagram/*`, `*/claude-*`)
- `costQualityTradeoff`: 0=quality, 5=balanced, 10=cheap
- `maxCandidates`: how many models in the fallback combo

## Test Cases

### SR1: Basic Routing — Code Task
**What:** Send a coding prompt, verify router picks a capable model.
**Pass criteria:** Response succeeds, model is from allowed providers.

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"Write a Python function to reverse a linked list"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('error'); print(f'PASS: {d.get("model")}') if not e else print(f'FAIL: {e}')"
# Expected: PASS: dialagram/nexum-router (or other dialagram/* model)
```

### SR2: Math Task Classification
**What:** Send a math prompt, verify different task type triggers.
**Pass criteria:** Creates `sr-modelRouter-math` combo.

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"What is the derivative of x^3 + 2x?"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Model: {d.get("model","?")}') if 'error' not in d else print(f'ERROR: {d.get("error")}')"
# Expected: Model: dialagram/nexum-router
# Server log should show: task: math
```

### SR3: Chat Task Classification
**What:** Send a conversational prompt.
**Pass criteria:** Creates `sr-modelRouter-general_chat` combo.

```bash
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"Tell me a joke about programming"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Model: {d.get("model","?")}') if 'error' not in d else print(f'ERROR: {d.get("error")}')"
# Expected: Model: dialagram/nexum-router
# Server log should show: task: general_chat
```

### SR4: Session Stickiness
**What:** Send two messages with same conversation fingerprint, verify same combo reused.
**Pass criteria:** Second request uses cached combo (no new combo created).

```bash
# First request creates combo
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"explain recursion"},{"role":"assistant","content":"Recursion is..."},{"role":"user","content":"give an example"}]}' > /dev/null

# Second request with same history should hit sticky session
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"explain recursion"},{"role":"assistant","content":"Recursion is..."},{"role":"user","content":"give an example"}]}' > /dev/null

# Check server logs for "Sticky session hit"
grep "Sticky session hit" /tmp/9r-server.log | tail -3
# Expected: at least one "Sticky session hit" entry
```

### SR5: Allowed Models Filter
**What:** Change `allowedModels` to exclude current provider, verify router finds no candidates.
**Pass criteria:** Returns error or falls through to normal resolution.

```bash
# Restrict to nonexistent provider
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"allowedModels":["nonexistent/*"]}}'

# Request should fail or fall through
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"test"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('error'); print(f'Expected behavior: {e}') if e else print(f'Unexpected success: {d.get("model")}')"

# Restore
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"allowedModels":["dialagram/*"]}}'
```

### SR6: Disable Smart Router
**What:** Turn off smart router, verify `modelRouter` passes through unchanged.
**Pass criteria:** Request fails with "model not found" (no provider named `modelRouter`).

```bash
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"enabled":false}}'

curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"modelRouter","stream":false,"messages":[{"role":"user","content":"test"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); e=d.get('error'); print(f'PASS: disabled correctly ({e})') if e else print('FAIL: still routing')"

# Re-enable
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"enabled":true}}'
```

### SR7: Custom Trigger Name
**What:** Add alternative trigger name, verify both work.
**Pass criteria:** Both `modelRouter` and `auto` route successfully.

```bash
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"names":["modelRouter","auto"]}}'

# Test "auto" trigger
curl -s -X POST http://127.0.0.1:20130/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <api-key>' \
  -d '{"model":"auto","stream":false,"messages":[{"role":"user","content":"hello"}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'PASS: auto -> {d.get("model")}') if 'error' not in d else print(f'FAIL: {d.get("error")}')"

# Restore
curl -s -b /tmp/9r-cookies.txt -X PATCH http://127.0.0.1:20130/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"smartRouter":{"names":["modelRouter"]}}'
```

## UI Verification

On `/dashboard/combos`, Smart Router card:
- [ ] Enabled toggle works (on/off persists after page refresh)
- [ ] Trigger names input accepts comma-separated values
- [ ] Allowed providers input filters correctly
- [ ] Allowed models input supports wildcards (`dialagram/*`)
- [ ] Cost/Quality slider changes scoring behavior
- [ ] Fallback chain size spinner updates `maxCandidates`
- [ ] Dynamic `sr-*` combos appear in combo list above
- [ ] Auto-cleanup toggle present (off by default)

## Server Log Patterns to Watch

```
[SMART] Router "modelRouter" → combo "sr-modelRouter-code-generation" (task: code:generation, top: dialagram/nexum-router, candidates: 3)
[SMART] Sticky session hit: modelRouter → sr-modelRouter-code-generation
[SMART] No suitable models found for modelRouter (task: general_chat)
[COMBO] Trying model 1/3: dialagram/nexum-router
```

## When to Re-Run

- After changes to `src/sse/services/smartRouter.js` (scoring, node discovery, combo creation)
- After changes to `open-sse/services/smartRouter.js` (classifyTask, scoreModel)
- After changes to `src/sse/handlers/chat.js` (interception point)
- After adding new task types to classifier
- After changing settings schema for smartRouter
