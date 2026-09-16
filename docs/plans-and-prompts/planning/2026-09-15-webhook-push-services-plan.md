# Webhook Implementation Plan — Push Services Integration (ntfy / Gotify / Pushover)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #push #ntfy #gotify #pushover

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

Implement the push-notification service layer: ntfy, Gotify, and Pushover outbound notifications. This overlaps with M3's notify action — this plan goes deeper on the push-specific details (auth, priorities, dedupe).

## Scope

**In scope:**
- ntfy: `ntfy://<topic>` (public) and `ntfy://<user>:<pass>@<host>/<topic>` (auth), priority + tags headers
- Gotify: `gotify://<host>/<token>`, priority + title
- Pushover: `pushover://<userkey>/<apptoken>`, priority + sound
- Shared push payload builder

**Out of scope (v1):**
- ntfy publish via WebSocket (only HTTP POST)
- Gotify app creation (manual)
- Pushover emergency priority (requires ack/retry loop)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/actions/platforms/ntfy.js` | new | ntfy sender |
| `src/lib/webhooks/actions/platforms/gotify.js` | new | Gotify sender |
| `src/lib/webhooks/actions/platforms/pushover.js` | new | Pushover sender |
| `src/lib/webhooks/actions/notify.js` | edit | Dispatch to push modules |

## Code

### 1. `src/lib/webhooks/actions/platforms/ntfy.js` — ntfy sender

```js
// src/lib/webhooks/actions/platforms/ntfy.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send to ntfy. Supports public topics and authenticated self-hosted.
 * URL forms:
 *   ntfy://<topic>                          (public ntfy.sh)
 *   ntfy://<user>:<pass>@<host>/<topic>     (self-hosted with auth)
 * @param {string} url - full ntfy:// URL
 * @param {{title?: string, message: string, priority?: number, tags?: string[]}} input
 */
export async function sendNtfy(url, input) {
  let host = "ntfy.sh";
  let topic = url.slice("ntfy://".length);
  let auth = null;

  // Self-hosted with credentials: ntfy://user:pass@host/topic
  const at = topic.lastIndexOf("@");
  if (at !== -1) {
    const creds = topic.slice(0, at);
    const rest = topic.slice(at + 1);
    const slash = rest.indexOf("/");
    host = slash === -1 ? rest : rest.slice(0, slash);
    topic = slash === -1 ? "" : rest.slice(slash + 1);
    const [user, pass] = creds.split(":");
    auth = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }

  const headers = { "Content-Type": "text/plain", Title: input.title || "9Router" };
  if (auth) headers.Authorization = auth;
  if (input.priority != null) headers.Priority = String(input.priority);
  if (input.tags?.length) headers.Tags = input.tags.join(",");

  const res = await proxyAwareFetch(`https://${host}/${topic}`, {
    method: "POST",
    headers,
    body: input.message,
  });
  return { ok: res.ok, status: res.status };
}
```

### 2. `src/lib/webhooks/actions/platforms/gotify.js` — Gotify sender

```js
// src/lib/webhooks/actions/platforms/gotify.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send to Gotify.
 * URL form: gotify://<host>/<token>
 * @param {string} url - full gotify:// URL
 * @param {{title?: string, message: string, priority?: number}} input
 */
export async function sendGotify(url, input) {
  const rest = url.slice("gotify://".length);
  const slash = rest.indexOf("/");
  const host = slash === -1 ? rest : rest.slice(0, slash);
  const token = slash === -1 ? "" : rest.slice(slash + 1);

  const res = await proxyAwareFetch(`https://${host}/message?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title || "9Router",
      message: input.message,
      priority: input.priority ?? 5,
    }),
  });
  return { ok: res.ok, status: res.status };
}
```

### 3. `src/lib/webhooks/actions/platforms/pushover.js` — Pushover sender

```js
// src/lib/webhooks/actions/platforms/pushover.js
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

/**
 * Send to Pushover.
 * URL form: pushover://<userkey>/<apptoken>
 * @param {string} url - full pushover:// URL
 * @param {{title?: string, message: string, priority?: number, sound?: string}} input
 */
export async function sendPushover(url, input) {
  const rest = url.slice("pushover://".length);
  const [userKey, appToken] = rest.split("/");

  const res = await proxyAwareFetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: appToken,
      user: userKey,
      title: input.title || "9Router",
      message: input.message,
      priority: String(input.priority ?? 0),
      ...(input.sound ? { sound: input.sound } : {}),
    }).toString(),
  });
  return { ok: res.ok, status: res.status };
}
```

### 4. `src/lib/webhooks/actions/notify.js` — dispatch to push modules

```js
// src/lib/webhooks/actions/notify.js (updated)
import { sendNtfy } from "./platforms/ntfy.js";
import { sendGotify } from "./platforms/gotify.js";
import { sendPushover } from "./platforms/pushover.js";

export async function runNotifyAction(action, event) {
  const url = action.url;
  const message = action.message || `[${event.type}] ${JSON.stringify(event.data)}`;
  const title = action.title || "9Router";

  if (url.startsWith("ntfy://")) return sendNtfy(url, { title, message });
  if (url.startsWith("gotify://")) return sendGotify(url, { title, message });
  if (url.startsWith("pushover://")) return sendPushover(url, { title, message });
  // ... slack://, discord://, tgram://, json:// handled by other modules
}
```

## Acceptance Criteria

- [ ] ntfy: public + authenticated self-hosted topics, priority + tags headers
- [ ] Gotify: token auth, priority
- [ ] Pushover: user key + app token, priority + sound
- [ ] All via `proxyAwareFetch` (respects 9router proxy config)

## Testing

```bash
# Unit test (tests/unit/webhook-push.test.js)
# - sendNtfy: public URL → ntfy.sh/<topic>; auth URL → Basic header
# - sendGotify: token in query, priority in body
# - sendPushover: form-encoded body with token/user/priority
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-05-messaging-platforms.md` (R15–R17), `../research/2026-09-15-webhook-exp-06-push-services.md` (R18–R20)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3 actions)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`