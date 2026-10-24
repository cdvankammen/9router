# Webhook Implementation Plan — Apprise Universal Adapter (R20)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r20 #apprise #notifications

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **⚠️ THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.**
>
> **The code in this plan is a SUGGESTION / OPTION for future agents — it is NOT a final decision and NOT an instruction to implement anything.**
>
> Every agent that reads this plan MUST understand:
> - This plan documents **research-grade suggestions** for how a feature *could* be implemented
> - The code snippets show **possible approaches** (file paths, function signatures, patterns) — they are **options**, not requirements
> - **Nothing in this plan should be implemented automatically** — a future agent must evaluate each suggestion, decide if there's a better way, and only then proceed
> - The agent is the final arbiter: if a better approach exists, **make those changes happen** — update the code, note the improvement, and proceed
> - Do not treat this code as sacred. It follows 9router's existing conventions, but the agent decides what to use.

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

## Rationale & Design Decisions

**Purpose:** Support Apprise notification URLs as a universal notification target, giving users one config string for 80+ services instead of per-platform adapters.

**Research grounding:** R20 (exp-06 push services) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Option A: `apprise` npm package** — fastest to ship, full service coverage, but adds a dependency with its own update cadence.
- **Option B: native URL parser + per-service adapters** — no dependency, but reimplements a subset of Apprise's service matrix.
- **Agent decides** — the plan explicitly leaves A vs B to the implementing agent, with trade-offs documented.

**Trade-offs & risks:** Trade-off: Option A trades dependency weight for coverage; Option B trades coverage for zero deps. If adopted, it supersedes the individual messaging/push adapters (R15–R19).

---
## Grounding in 9router

**Auth registration:** `/api/webhooks/actions` → **`PROTECTED_API_PATHS`**

An Apprise target is just another action entry; no separate auth surface.

**Conventions this plan must follow:**
- Import `getSettings`/`updateSettings` from `@/lib/localDb` in route handlers (matches `src/app/api/settings/route.js`)
- Start workers from `src/instrumentation.js` (settings-gated, `NEXT_RUNTIME === "nodejs"`) — layout chunks tree-shake in standalone builds
- New migrations start at **006** (`src/lib/db/migrations/` currently ends at `005-seen-models.js`)
- Keep `export const dynamic = "force-dynamic"` on every route
- Strip secrets from request bodies and never return them in GET responses (CWE-915 pattern from `src/app/api/settings/route.js`)
- Reuse `src/shared/hookTemplate.js` for `{{field}}` expansion — it already exists

See `2026-10-03-webhook-grounding-in-9router.md` for the full discrepancy list.

---

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