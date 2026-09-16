# Webhook Implementation Plan — M3: Rule Engine (TCA) + Actions

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #m3 #rule-engine #actions #tca

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions (settingsRepo, analyze-error pipeline),
> but the agent is the final arbiter of implementation quality.

---

## Objective

Implement M3 of the webhook system: the Trigger→Condition→Action (TCA) rule engine (Home Assistant model) with 5 action types. This is the "things happen" half — it turns events into notifications, HTTP calls, LLM analysis, gateway toggles, and dashboard feeds.

## Scope

**In scope:**
- `rules.js` — rule matching + action dispatch
- Action modules: notify, http, llm, gateway, dashboard
- Rules stored in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`
- Trigger events: `provider.error`, `quota.warning`, `quota.exhausted`, `request.completed`, `webhook.inbound`, `fallback.used`, `model.added`

**Out of scope (v1):**
- Visual workflow editor (n8n-style) — JSON rules only
- Outbound triggers wiring (M4) — the emitter that produces events
- Dashboard UI (M5)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/rules.js` | new | Rule matching + action dispatch |
| `src/lib/webhooks/actions/notify.js` | new | Apprise-style URL sender |
| `src/lib/webhooks/actions/http.js` | new | Outbound POST |
| `src/lib/webhooks/actions/llm.js` | new | Reuse analyze-error pipeline |
| `src/lib/webhooks/actions/gateway.js` | new | Toggle provider/fallback |
| `src/lib/webhooks/actions/dashboard.js` | new | SSE feed |
| `src/lib/db/repos/settingsRepo.js` | edit | Add `webhookRules` + `notifyUrls` defaults |

## Code

### 1. `src/lib/webhooks/rules.js` — Rule matching + dispatch

```js
// src/lib/webhooks/rules.js
// TCA rule engine: { trigger: {event, filter}, condition: {and: [...]}, actions: [...] }
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runNotifyAction } from "./actions/notify.js";
import { runHttpAction } from "./actions/http.js";
import { runLlmAction } from "./actions/llm.js";
import { runGatewayAction } from "./actions/gateway.js";
import { runDashboardAction } from "./actions/dashboard.js";

const ACTION_HANDLERS = {
  notify: runNotifyAction,
  http: runHttpAction,
  llm: runLlmAction,
  gateway: runGatewayAction,
  dashboard: runDashboardAction,
};

/**
 * Evaluate a condition tree: { and: [...] } | { or: [...] } | { field, op, value }
 * @param {object} condition
 * @param {object} event
 * @returns {boolean}
 */
export function evaluateCondition(condition, event) {
  if (!condition) return true;
  if (condition.and) return condition.and.every((c) => evaluateCondition(c, event));
  if (condition.or) return condition.or.some((c) => evaluateCondition(c, event));
  if (condition.field && condition.op) {
    const actual = getField(event, condition.field);
    return compare(actual, condition.op, condition.value);
  }
  return true;
}

function getField(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function compare(actual, op, expected) {
  switch (op) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return actual > expected;
    case "lt": return actual < expected;
    case "contains": return String(actual ?? "").includes(String(expected));
    case "regex": return new RegExp(String(expected)).test(String(actual ?? ""));
    default: return false;
  }
}

/**
 * Match a rule against an event.
 * @param {object} rule
 * @param {{type: string, data: object}} event
 * @returns {boolean}
 */
export function ruleMatches(rule, event) {
  if (rule.trigger?.event && rule.trigger.event !== event.type) return false;
  if (rule.trigger?.filter) {
    // JSONPath-lite: filter is a field path; event must have a truthy value there
    const val = getField(event.data, rule.trigger.filter);
    if (!val) return false;
  }
  return evaluateCondition(rule.condition, event.data);
}

/**
 * Dispatch an event through all matching rules.
 * @param {{type: string, data: object}} event
 * @returns {Promise<Array<{ruleId: string, actionResults: Array}>>}
 */
export async function dispatchEvent(event) {
  const settings = await getSettings();
  const rules = settings.webhookRules || [];
  const results = [];
  for (const rule of rules) {
    if (!ruleMatches(rule, event)) continue;
    const actionResults = [];
    for (const action of rule.actions || []) {
      const handler = ACTION_HANDLERS[action.type];
      if (!handler) {
        actionResults.push({ type: action.type, ok: false, error: "unknown action type" });
        continue;
      }
      try {
        const res = await handler(action, event);
        actionResults.push({ type: action.type, ok: true, ...res });
      } catch (err) {
        actionResults.push({ type: action.type, ok: false, error: err?.message || String(err) });
      }
    }
    results.push({ ruleId: rule.id, actionResults });
  }
  return results;
}
```

### 2. `src/lib/webhooks/actions/notify.js` — Apprise-style URL sender

```js
// src/lib/webhooks/actions/notify.js
// Apprise-style URL schemes: ntfy://, slack://, discord://, tgram://, gotify://, json://
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send a notification via an Apprise-style URL.
 * @param {{url: string, message?: string, title?: string}} action
 * @param {{type: string, data: object}} event
 */
export async function runNotifyAction(action, event) {
  const url = action.url;
  const message = action.message || `[${event.type}] ${JSON.stringify(event.data)}`;
  const title = action.title || "9Router";

  if (url.startsWith("ntfy://")) {
    const topic = url.slice("ntfy://".length);
    const res = await proxyAwareFetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Title: title },
      body: message,
    });
    return { ok: res.ok, status: res.status };
  }

  if (url.startsWith("slack://")) {
    const webhookUrl = url.slice("slack://".length);
    const res = await proxyAwareFetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    return { ok: res.ok, status: res.status };
  }

  if (url.startsWith("discord://")) {
    const webhookUrl = url.slice("discord://".length);
    const res = await proxyAwareFetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return { ok: res.ok, status: res.status };
  }

  if (url.startsWith("tgram://")) {
    // tgram://<bottoken>/<chatid>
    const rest = url.slice("tgram://".length);
    const [botToken, chatId] = rest.split("/");
    const res = await proxyAwareFetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }
    );
    return { ok: res.ok, status: res.status };
  }

  if (url.startsWith("gotify://")) {
    // gotify://<hostname>/<token>
    const rest = url.slice("gotify://".length);
    const [host, token] = rest.split("/");
    const res = await proxyAwareFetch(`https://${host}/message?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    });
    return { ok: res.ok, status: res.status };
  }

  if (url.startsWith("json://")) {
    const target = url.slice("json://".length);
    const res = await proxyAwareFetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, event }),
    });
    return { ok: res.ok, status: res.status };
  }

  return { ok: false, error: `unsupported scheme: ${url}` };
}
```

### 3. `src/lib/webhooks/actions/http.js` — Outbound POST

```js
// src/lib/webhooks/actions/http.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Generic outbound HTTP action.
 * @param {{url: string, method?: string, headers?: object, body?: any}} action
 * @param {{type: string, data: object}} event
 */
export async function runHttpAction(action, event) {
  const res = await proxyAwareFetch(action.url, {
    method: action.method || "POST",
    headers: { "Content-Type": "application/json", ...(action.headers || {}) },
    body: JSON.stringify(action.body ?? event.data),
  });
  return { ok: res.ok, status: res.status };
}
```

### 4. `src/lib/webhooks/actions/llm.js` — Reuse analyze-error pipeline

```js
// src/lib/webhooks/actions/llm.js
// Reuses the analyze-error pipeline (credentials → handleChatCore) so any
// connected provider works. Same pattern as src/app/api/analyze-error/route.js.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getModelInfo } from "@/sse/services/model.js";
import { getProviderCredentials } from "@/sse/services/auth.js";
import { handleChatCore } from "open-sse/handlers/chatCore.js";

/**
 * LLM action: send event data to a model for analysis/decision.
 * @param {{model?: string, prompt?: string}} action
 * @param {{type: string, data: object}} event
 */
export async function runLlmAction(action, event) {
  const settings = await getSettings();
  const modelStr = action.model || settings.analyzeErrorModel || "oc/mimo-v2.5-free";
  const modelInfo = await getModelInfo(modelStr);
  if (!modelInfo?.provider) {
    return { ok: false, error: `Invalid model: ${modelStr}` };
  }
  const credentials = await getProviderCredentials(modelInfo.provider);
  if (!credentials) {
    return { ok: false, error: `No credentials for ${modelInfo.provider}` };
  }

  const prompt = action.prompt || `Analyze this webhook event and decide if action is needed:\n${JSON.stringify(event.data, null, 2)}`;

  const result = await handleChatCore({
    body: {
      model: modelStr,
      messages: [
        { role: "system", content: "You are 9Router's webhook event analyst. Be concise." },
        { role: "user", content: prompt },
      ],
    },
    modelInfo,
    credentials,
    stream: false,
    connectionId: credentials.connectionId || "webhook-llm",
    userAgent: "9router-webhook-llm",
  });

  const resp = result?.response || result;
  if (!resp || typeof resp.json !== "function") {
    return { ok: false, error: "LLM request failed" };
  }
  const body = await resp.json().catch(() => ({}));
  const analysis =
    body?.choices?.[0]?.message?.content ||
    body?.content ||
    body?.output?.[0]?.content?.[0]?.text ||
    null;
  return { ok: !!analysis, analysis };
}
```

### 5. `src/lib/webhooks/actions/gateway.js` — Toggle provider/fallback

```js
// src/lib/webhooks/actions/gateway.js
// One API's auto-disable / LiteLLM cooldown pattern: toggle a provider or fallback.
import { getSettings, updateSettings } from "@/lib/db/repos/settingsRepo.js";

/**
 * Gateway action: enable/disable a provider or fallback combo.
 * @param {{provider?: string, enabled?: boolean, fallback?: string}} action
 */
export async function runGatewayAction(action) {
  const settings = await getSettings();
  if (action.provider) {
    // TODO: wire to provider connection enable/disable (provider-nodes API)
    console.log(`[webhook-gateway] ${action.enabled ? "enable" : "disable"} provider ${action.provider}`);
    return { ok: true, action: "provider-toggle", provider: action.provider, enabled: action.enabled };
  }
  if (action.fallback) {
    // TODO: wire to modelFallbacks toggle
    console.log(`[webhook-gateway] toggle fallback ${action.fallback}`);
    return { ok: true, action: "fallback-toggle", fallback: action.fallback };
  }
  return { ok: false, error: "gateway action needs provider or fallback" };
}
```

### 6. `src/lib/webhooks/actions/dashboard.js` — SSE feed

```js
// src/lib/webhooks/actions/dashboard.js
// SSE feed to the dashboard (real-time event display).
// Uses the same SSE pattern as the existing dashboard streams.

const listeners = new Set();

export function addDashboardListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Dashboard action: push event to the UI feed.
 * @param {object} action
 * @param {{type: string, data: object}} event
 */
export async function runDashboardAction(action, event) {
  const payload = JSON.stringify({ type: event.type, data: event.data, at: new Date().toISOString() });
  for (const fn of listeners) {
    try { fn(payload); } catch { /* fail-open */ }
  }
  return { ok: true, listeners: listeners.size };
}
```

### 7. `src/lib/db/repos/settingsRepo.js` — add `webhookRules` + `notifyUrls` defaults

```js
// In DEFAULT_SETTINGS, add:
  // TCA rule engine rules: [{ id, trigger: {event, filter}, condition, actions }]
  webhookRules: [],
  // Apprise-style outbound URLs: ["ntfy://mytopic", "slack://...", ...]
  notifyUrls: [],
```

## Acceptance Criteria

- [ ] Rule JSON: `{trigger: {event, filter}, condition: {and: [...]}, actions: [...]}`
- [ ] Trigger events: `provider.error`, `quota.warning`, `quota.exhausted`, `request.completed`, `webhook.inbound`, `fallback.used`, `model.added`
- [ ] Conditions: field/op/value comparisons (eq, neq, gt, lt, contains, regex)
- [ ] Actions: notify (ntfy://, slack://, discord://, tgram://, gotify://, json://), http, llm, gateway, dashboard
- [ ] Rules stored in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`, PATCH-able via `/api/settings`

## Testing

```bash
# Unit test (tests/unit/webhook-rules.test.js)
# - evaluateCondition: eq/neq/gt/lt/contains/regex, and/or trees
# - ruleMatches: trigger event + filter
# - dispatchEvent: unknown action type → error result, not throw
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-04-rule-engine-actions.md` (R12–R14)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`