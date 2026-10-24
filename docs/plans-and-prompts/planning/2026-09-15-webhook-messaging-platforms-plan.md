# Webhook Implementation Plan — Messaging Platforms Integration (Slack / Discord / Telegram)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #messaging #slack #discord #telegram

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

Implement the messaging-platform integration layer: Slack, Discord, and Telegram outbound notifications (and inbound where applicable). This overlaps with M3's notify action — this plan goes deeper on the platform-specific details.

## Scope

**In scope:**
- Slack: incoming webhooks (`hooks.slack.com/services/T/B/X`), blocks/attachments, 30k/hr cap
- Discord: `/webhooks/<id>/<token>`, slack/github-compatible endpoints (one formatter for both)
- Telegram: `sendMessage`, chat_id = user/group/channel
- One shared formatter for Slack/Discord (both accept Slack-compatible payloads)

**Out of scope (v1):**
- Socket Mode / WebSocket inbound (Slack model)
- Discord Ed25519 signature verification (interactions)
- Telegram bot webhook registration (setWebhook)

## Rationale & Design Decisions

**Purpose:** Deliver webhook-triggered notifications to chat platforms (Slack, Discord, Telegram, ntfy) so users get alerts where they already work.

**Research grounding:** R15–R17 (exp-05 messaging platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Per-platform adapters behind one interface** — each platform is a small module with `send(payload)`; the action registry picks the adapter by URL scheme.
- **Webhook-URL-based config** — Slack/Discord/ntfy use incoming webhook URLs; Telegram uses bot token + chat id; all stored in settings, never in code.
- **Fail-open with logging** — a failed platform send logs and continues; no retry storm (retries belong to the outbox worker).
- **Payload templating** — a minimal `{{field}}` substitution so users control message shape without code.

**Trade-offs & risks:** Trade-off: each platform has its own rate limits and payload quirks — the adapter interface isolates that. Telegram/ntfy need outbound internet; local-only deployments should use the SSE/WS feed plans instead.

---
## Grounding in 9router

**Auth registration:** `/api/webhooks/actions` → **`src/dashboardGuard.js` → `PROTECTED_API_PATHS`**

Sending is outbound and HMAC-signed by each platform; only the CRUD surface needs dashboard auth.

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
| `src/lib/webhooks/actions/notify.js` | edit | Deeper platform handling (split into platform modules) |
| `src/lib/webhooks/actions/platforms/slack.js` | new | Slack sender |
| `src/lib/webhooks/actions/platforms/discord.js` | new | Discord sender |
| `src/lib/webhooks/actions/platforms/telegram.js` | new | Telegram sender |
| `src/lib/webhooks/actions/platforms/format.js` | new | Shared Slack/Discord formatter |

## Code

### 1. `src/lib/webhooks/actions/platforms/format.js` — Shared formatter

```js
// src/lib/webhooks/actions/platforms/format.js
// One formatter for Slack AND Discord (both accept Slack-compatible payloads).

/**
 * Build a Slack/Discord-compatible message payload.
 * @param {{title?: string, message: string, event?: object}} input
 * @returns {object}
 */
export function formatMessage({ title, message, event }) {
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: title || "9Router" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: message },
    },
  ];
  if (event) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Event: \`${event.type}\` at ${new Date().toISOString()}` },
      ],
    });
  }
  return { text: message, blocks };
}
```

### 2. `src/lib/webhooks/actions/platforms/slack.js` — Slack sender

```js
// src/lib/webhooks/actions/platforms/slack.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { formatMessage } from "./format.js";

/**
 * Send to a Slack incoming webhook.
 * @param {string} webhookUrl - https://hooks.slack.com/services/T/B/X
 * @param {{title?: string, message: string, event?: object}} input
 */
export async function sendSlack(webhookUrl, input) {
  const res = await proxyAwareFetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formatMessage(input)),
  });
  return { ok: res.ok, status: res.status };
}
```

### 3. `src/lib/webhooks/actions/platforms/discord.js` — Discord sender

```js
// src/lib/webhooks/actions/platforms/discord.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { formatMessage } from "./format.js";

/**
 * Send to a Discord webhook. Discord accepts Slack-compatible payloads
 * (slack-compatible endpoint), so we reuse the same formatter.
 * @param {string} webhookUrl - https://discord.com/api/webhooks/<id>/<token>
 * @param {{title?: string, message: string, event?: object}} input
 */
export async function sendDiscord(webhookUrl, input) {
  const res = await proxyAwareFetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formatMessage(input)),
  });
  return { ok: res.ok, status: res.status };
}
```

### 4. `src/lib/webhooks/actions/platforms/telegram.js` — Telegram sender

```js
// src/lib/webhooks/actions/platforms/telegram.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send a Telegram message.
 * @param {string} botToken
 * @param {string} chatId - user/group/channel id
 * @param {{title?: string, message: string}} input
 */
export async function sendTelegram(botToken, chatId, input) {
  const text = input.title ? `${input.title}\n${input.message}` : input.message;
  const res = await proxyAwareFetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
  return { ok: res.ok, status: res.status };
}
```

### 5. `src/lib/webhooks/actions/notify.js` — use platform modules

```js
// src/lib/webhooks/actions/notify.js (updated)
// Apprise-style URL schemes dispatch to platform modules.
import { sendSlack } from "./platforms/slack.js";
import { sendDiscord } from "./platforms/discord.js";
import { sendTelegram } from "./platforms/telegram.js";

export async function runNotifyAction(action, event) {
  const url = action.url;
  const message = action.message || `[${event.type}] ${JSON.stringify(event.data)}`;
  const title = action.title || "9Router";

  if (url.startsWith("slack://")) {
    return sendSlack(url.slice("slack://".length), { title, message, event });
  }
  if (url.startsWith("discord://")) {
    return sendDiscord(url.slice("discord://".length), { title, message, event });
  }
  if (url.startsWith("tgram://")) {
    const [botToken, chatId] = url.slice("tgram://".length).split("/");
    return sendTelegram(botToken, chatId, { title, message });
  }
  // ... ntfy://, gotify://, json:// handled as before (M3 plan)
}
```

## Acceptance Criteria

- [ ] Slack: `slack://https://hooks.slack.com/services/T/B/X` sends formatted blocks
- [ ] Discord: `discord://https://discord.com/api/webhooks/<id>/<token>` sends via slack-compatible endpoint
- [ ] Telegram: `tgram://<bottoken>/<chatid>` sends sendMessage
- [ ] One formatter for Slack + Discord (blocks + context)

## Testing

```bash
# Unit test (tests/unit/webhook-platforms.test.js)
# - formatMessage produces valid Slack blocks
# - sendSlack/sendDiscord/sendTelegram hit correct URLs (mock fetch)
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-05-messaging-platforms.md` (R15–R17), `../research/2026-09-15-webhook-branch-b1a-messaging-platforms.md`
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3 actions)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`