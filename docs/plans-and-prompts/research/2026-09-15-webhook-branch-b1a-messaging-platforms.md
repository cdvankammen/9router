# Branch Research — B1a: Messaging Platforms (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #outbound #messaging #slack #discord #telegram #binary-tree #branch-b1a

## Objective

Deep-dive the **messaging platforms** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers Slack (B1a1) and Discord & Telegram (B1a2), down to L6 leaves.

```
B1a MESSAGING PLATFORMS
├─ B1a1: SLACK
│  ├─ B1a1L: incoming webhooks
│  │  ├─ B1a1LL: URL format & message shape
│  │  └─ B1a1LR: formatting (blocks, attachments)
│  └─ B1a1R: rate limits & retries
│     ├─ B1a1RL: 30k events/hr workspace cap
│     └─ B1a1RR: retry semantics (x-slack-retry-num)
└─ B1a2: DISCORD & TELEGRAM
   ├─ B1a2L: discord webhooks
   │  ├─ B1a2LL: /webhooks/<id>/<token> URL
   │  └─ B1a2LR: slack/github-compatible endpoints
   └─ B1a2R: telegram bots
      ├─ B1a2RL: sendMessage API
      └─ B1a2RR: chat_id targeting
```

## Codebase grounding (what exists today)

### No outbound notification code exists

- `grep "apprise|ntfy|gotify|discord|slack|telegram|pushover|pagerduty"` in `src/**` → EMPTY.
- The only notification surface is UI toasts (`src/store/notificationStore.js` — Zustand) and CLI tray notifications.
- The deferred spec (`messages-page-feature-spec.md` §6) names Apprise-style URLs → Slack/Discord/ntfy/Gotify/Telegram — this branch researches the exact wire formats those URLs must produce.

## External research

### B1a1LL — Slack incoming webhook URL format & message shape

- **URL:** `https://hooks.slack.com.example/REDACTED_PLACEHOLDER` — the token in the path IS the auth (no headers).
- **Message shape:** `{"text": "Hello"}` or `{"text": "...", "blocks": [...]}`.
- **Recommended:** 9router's `slack://` notify URL stores the full hooks URL; the notifier POSTs `{text}` (or `{blocks}` for rich messages).

### B1a1LR — Slack formatting (blocks, attachments)

- **Blocks** (modern): `[{type: "section", text: {type: "mrkdwn", text: "..."}}]` — rich layout, buttons, fields.
- **Attachments** (legacy): `{attachments: [{color, title, text, fields}]}` — still supported.
- **Recommended:** v1 sends `{text}` with markdown; v2 adds blocks for structured alerts (color-coded severity, fields for provider/model/error).

### B1a1RL — Slack rate limits (30k events/hr)

- **Events API:** 30,000 events/workspace/hour; `app_rate_limited` event when exceeded.
- **Incoming webhooks:** rate-limited per workspace (documented as "may be rate limited").
- **Recommended:** 9router's notifier should batch/dedupe (Alertmanager semantics from the deferred spec: group by fingerprint, min-interval dedupe) to stay well under limits.

### B1a1RR — Slack retry semantics

- **Events API retries:** 3 retries (immediate, 1min, 5min) with `x-slack-retry-num` (1/2/3) and `x-slack-retry-reason` (`http_timeout`, `too_many_redirects`, `connection_failed`, `ssl_error`, `http_error`, `unknown_error`); `x-slack-no-retry: 1` opt-out.
- **Incoming webhooks:** no documented retry — the sender (9router) owns retries.
- **Recommended:** 9router's outbox worker retries failed notifications with exponential backoff (A2a2RL) — the sender-side retry model.

### B1a2LL — Discord webhook URL

- **URL:** `https://discord.com/api/v10/webhooks/<id>/<token>` — id + token in path.
- **Execute params:** `content` (2000 chars), `embeds` (10), `username`/`avatar_url` overrides, `allowed_mentions`, `components`, `files`, `poll`; `wait` query param for response.
- **Recommended:** 9router's `discord://` notify URL stores `id/token`; the notifier POSTs `{content}` (or `{embeds}` for rich).

### B1a2LR — Discord slack/github-compatible endpoints

- **Slack-compatible:** `/webhooks/<id>/<token>/slack` — accepts Slack-format payloads.
- **GitHub-compatible:** `/webhooks/<id>/<token>/github` — accepts GitHub-format payloads.
- **Recommended:** 9router can POST Slack-format payloads to Discord's `/slack` endpoint — one formatter for both platforms (the Apprise approach).

### B1a2RL — Telegram sendMessage API

- **URL:** `https://api.telegram.org/bot<token>/sendMessage` — token in path.
- **Body:** `{chat_id, text, parse_mode, disable_web_page_preview, reply_markup}`.
- **Recommended:** 9router's `tgram://` notify URL stores `botToken/chatId`; the notifier POSTs `{chat_id, text, parse_mode: "Markdown"}`.

### B1a2RR — Telegram chat_id targeting

- `chat_id` can be a user ID, group ID (negative), or channel username (`@channel`).
- **Recommended:** store chat_id in the URL (`tgram://bottoken/chatid`); support `parse_mode: "Markdown"` for formatting.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| B1a1LL | `hooks.slack.com/services/...` URL; `{text}` body | Slack Incoming Webhooks |
| B1a1LR | Blocks for rich alerts (v2); text+markdown v1 | Slack Blocks API |
| B1a1RL | Batch/dedupe to stay under 30k/hr | Slack rate limits, Alertmanager spec |
| B1a1RR | Sender-side retries via outbox worker | Slack retry headers, Stripe backoff |
| B1a2LL | `discord.com/api/v10/webhooks/<id>/<token>`; content/embeds | Discord Webhooks |
| B1a2LR | POST Slack-format to `/slack` endpoint | Discord Slack-compatible endpoint |
| B1a2RL | `api.telegram.org/bot<token>/sendMessage`; chat_id+text | Telegram Bot API |
| B1a2RR | chat_id = user/group/channel; Markdown parse_mode | Telegram Bot API |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 C1 Slack, C2 Discord, C3 Telegram)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3 notify action, M4 outbound)