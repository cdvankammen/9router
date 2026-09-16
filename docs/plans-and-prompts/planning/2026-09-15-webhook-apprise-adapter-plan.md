# Webhook Implementation Plan — Apprise Universal Adapter (R20)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r20 #apprise #notifications

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions, but the agent is the final
> arbiter of implementation quality.

---

## Objective

Implement the Apprise universal adapter (R20): instead of hand-coding each notification scheme, wrap the Apprise URL format so ANY of its 80+ services work. Two options are explored — the agent must decide which is better (that's the point of the review note).

## Scope

**In scope:**
- Option A: `apprise` npm package as a dependency (full 80+ service support)
- Option B: native URL parser + per-scheme dispatch (zero deps, ~10 schemes)
- Config: `notifyUrls` accepts Apprise-style URLs

**Out of scope (v1):**
- Apprise API server (self-hosted REST wrapper)
- CLI integration

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/actions/notify.js` | edit | Route through Apprise adapter |
| `src/lib/webhooks/actions/apprise.js` | new | Apprise URL parser + dispatcher |
| `package.json` | edit | Add `apprise` (Option A only) |

## Code

### 1. `src/lib/webhooks/actions/apprise.js` — Option A (npm package)

```js
// src/lib/webhooks/actions/apprise.js
// Option A: use the apprise npm package (full service support).
// NOTE: verify the package name/API before committing to this —
// the agent should check npm for the current best package.
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send via Apprise URL using the npm package.
 * @param {string} appriseUrl - e.g. "tgram://bot:token/chatid"
 * @param {{title?: string, message: string}} input
 */
export async function sendViaApprise(appriseUrl, input) {
  // Option A implementation (if apprise package is added):
  // const { Apprise } = await import("apprise");
  // const apprise = new Apprise();
  // apprise.add(appriseUrl);
  // await apprise.notify(input.title || "9Router", input.message);
  return { ok: false, error: "Option A not implemented — agent decision needed" };
}
```

### 2. `src/lib/webhooks/actions/apprise.js` — Option B (native parser)

```js
// src/lib/webhooks/actions/apprise.js
// Option B: native Apprise-style URL parser + dispatch to existing modules.
// Zero new dependencies; supports the schemes 9router already implements
// (ntfy, slack, discord, telegram, gotify, pushover, json) plus a few more.
import { sendNtfy } from "./platforms/ntfy.js";
import { sendGotify } from "./platforms/gotify.js";
import { sendPushover } from "./platforms/pushover.js";
import { sendSlack } from "./platforms/slack.js";
import { sendDiscord } from "./platforms/discord.js";
import { sendTelegram } from "./platforms/telegram.js";

const SCHEME_HANDLERS = {
  ntfy: sendNtfy,
  gotify: sendGotify,
  pushover: sendPushover,
  slack: sendSlack,
  discord: sendDiscord,
  tgram: sendTelegram,
};

/**
 * Parse an Apprise-style URL and dispatch to the right sender.
 * @param {string} appriseUrl
 * @param {{title?: string, message: string}} input
 */
export async function sendViaApprise(appriseUrl, input) {
  const scheme = appriseUrl.split("://")[0];
  const handler = SCHEME_HANDLERS[scheme];
  if (!handler) {
    return { ok: false, error: `unsupported scheme: ${scheme}` };
  }
  return handler(appriseUrl, input);
}
```

### 3. `src/lib/webhooks/actions/notify.js` — route through adapter (edit)

```js
// In runNotifyAction, replace the per-scheme if-chain with:
import { sendViaApprise } from "./apprise.js";
// ...
export async function runNotifyAction(action, event) {
  const message = action.message || `[${event.type}] ${JSON.stringify(event.data)}`;
  return sendViaApprise(action.url, { title: action.title || "9Router", message });
}
```

## Acceptance Criteria

- [ ] `notifyUrls` accepts Apprise-style URLs
- [ ] Option A: full 80+ service support via npm package (if chosen)
- [ ] Option B: zero-dep dispatch for implemented schemes (if chosen)
- [ ] Agent decides which option is better for 9router (dependency weight vs coverage)

## Testing

```bash
# Unit test (tests/unit/webhook-apprise.test.js)
# - URL parsing: scheme extraction, credential splitting
# - dispatch: known scheme → handler called; unknown → error result
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-06-push-services.md` (R20)
- Plan: `../planning/2026-09-15-webhook-push-services-plan.md` (push modules)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`