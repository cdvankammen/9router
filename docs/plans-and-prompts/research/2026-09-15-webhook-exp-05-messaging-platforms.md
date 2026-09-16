# Exponential Branch 05 — Messaging Platforms (R15–R17)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #messaging #slack #discord #telegram #branch-exp-05

## Objective

N-ary exponential expansion (6 levels, N children per node) of the messaging-platform roots: R15 Slack integration, R16 Discord integration, R17 Telegram integration.

## R15 — Slack integration

```
L0 R15: SLACK INTEGRATION
├─ L1: incoming webhooks
│  ├─ L2: URL format
│  │  ├─ L3: https://hooks.slack.com/services/T/B/X
│  │  │  ├─ L4: token in path = auth
│  │  │  │  ├─ L5: no headers needed
│  │  │  │  │  └─ L6: POST {text}
│  │  │  │  └─ L5: keep secret
│  │  │  │     └─ L6: settings, not code
│  │  │  └─ L4: workspace + channel bound
│  │  │     └─ L5: created in Slack UI
│  │  └─ L3: message shape
│  │     ├─ L4: {text: "..."}
│  │     │  └─ L5: markdown supported
│  │     ├─ L4: {blocks: [...]}
│  │     │  ├─ L5: section, divider, actions
│  │     │  │  └─ L6: mrkdwn text
│  │     │  └─ L5: rich layout
│  │     └─ L4: {attachments: [...]}
│  │        └─ L5: legacy, still works
│  ├─ L2: formatting
│  │  ├─ L3: mrkdwn syntax
│  │  │  ├─ L4: *bold* _italic_ `code`
│  │  │  ├─ L4: <url|label>
│  │  │  └─ L4: :emoji:
│  │  ├─ L3: severity colors
│  │  │  ├─ L4: #2eb886 green (ok)
│  │  │  ├─ L4: #e01e5a red (error)
│  │  │  └─ L4: #ffcc00 yellow (warn)
│  │  └─ L3: fields
│  │     ├─ L4: provider, model, error
│  │     └─ L4: short/long
│  └─ L2: rate limits
│     ├─ L3: 30k events/hr workspace
│     │  ├─ L4: app_rate_limited event
│     │  └─ L4: batch/dedupe (Alertmanager)
│     └─ L3: per-webhook
│        └─ L4: undocumented, be safe
├─ L1: Events API (inbound, v2)
│  ├─ L2: URL verification
│  │  ├─ L3: challenge token
│  │  │  └─ L4: echo back
│  │  └─ L3: 3s rule
│  │     └─ L4: ack fast
│  ├─ L2: HMAC verification
│  │  ├─ L3: v0:timestamp:raw_body
│  │  │  ├─ L4: SHA-256
│  │  │  │  └─ L5: timingSafeEqual
│  │  │  └─ L4: 5-min tolerance
│  │  │     └─ L5: replay protection
│  │  └─ L3: signing secret
│  │     └─ L4: app-level
│  ├─ L2: retries
│  │  ├─ L3: ×3 (immediate, 1min, 5min)
│  │  │  ├─ L4: x-slack-retry-num 1/2/3
│  │  │  │  └─ L5: dedupe by event_id
│  │  │  └─ L4: x-slack-retry-reason
│  │  │     └─ L5: http_timeout, connection_failed, ...
│  │  └─ L3: x-slack-no-retry: 1
│  │     └─ L4: opt-out
│  └─ L2: Socket Mode (v2)
│     ├─ L3: WebSocket, no public URL
│     │  └─ L4: local gateway friendly
│     └─ L3: app-level tokens
│        └─ L4: xapp-1-...
├─ L1: 9router application
│  ├─ L2: notify action
│  │  ├─ L3: slack:// URL in settings
│  │  │  └─ L4: R14 notify
│  │  ├─ L3: {text} v1
│  │  │  └─ L4: markdown
│  │  └─ L3: {blocks} v2
│  │     └─ L4: severity colors
│  ├─ L2: inbound (v2)
│  │  ├─ L3: Events API receiver
│  │  │  └─ L4: R01 endpoint
│  │  └─ L3: Socket Mode
│  │     └─ L4: no tunnel needed
│  └─ L2: LLM action
│     ├─ L3: reacji→LLM pattern
│     │  └─ L4: R14 llm
│     └─ L3: reply in thread
│        └─ L4: thread_ts
```

## R16 — Discord integration

```
L0 R16: DISCORD INTEGRATION
├─ L1: webhooks
│  ├─ L2: URL format
│  │  ├─ L3: /webhooks/<id>/<token>
│  │  │  ├─ L4: id + token in path
│  │  │  │  ├─ L5: POST JSON
│  │  │  │  └─ L5: no auth header
│  │  │  └─ L4: created per channel
│  │  │     └─ L5: channel bound
│  │  └─ L3: types
│  │     ├─ L4: Incoming (1)
│  │     ├─ L4: Channel Follower (2)
│  │     └─ L4: Application (3)
│  ├─ L2: execute params
│  │  ├─ L3: content (2000 chars)
│  │  │  └─ L4: truncate
│  │  ├─ L3: embeds (10)
│  │  │  ├─ L4: title, description, color
│  │  │  │  └─ L5: fields, footer, timestamp
│  │  │  └─ L4: rich alerts
│  │  ├─ L3: username / avatar_url
│  │  │  └─ L4: override
│  │  ├─ L3: allowed_mentions
│  │  │  └─ L4: @everyone control
│  │  ├─ L3: components
│  │  │  └─ L4: buttons
│  │  ├─ L3: files
│  │  │  └─ L4: multipart
│  │  └─ L3: poll
│  │     └─ L4: v10
│  ├─ L2: compatible endpoints
│  │  ├─ L3: /slack (Slack-format)
│  │  │  ├─ L4: POST Slack payload
│  │  │  │  └─ L5: one formatter for both
│  │  │  └─ L4: Apprise uses this
│  │  └─ L3: /github (GitHub-format)
│  │     └─ L4: GitHub events
│  └─ L2: rate limits
│     ├─ L3: 30 req/min per webhook
│     │  └─ L4: batch
│     └─ L3: 429 + Retry-After
│        └─ L4: honor
├─ L1: interactions (inbound, v2)
│  ├─ L2: Ed25519 signatures
│  │  ├─ L3: X-Signature-Ed25519
│  │  │  └─ L4: verify with public key
│  │  └─ L3: X-Signature-Timestamp
│  │     └─ L4: 15-min tolerance
│  ├─ L2: interaction types
│  │  ├─ L3: PING (1)
│  │  │  └─ L4: respond PONG
│  │  ├─ L3: APPLICATION_COMMAND (2)
│  │  ├─ L3: MESSAGE_COMPONENT (3)
│  │  ├─ L3: MODAL_SUBMIT (5)
│  │  └─ L3: 3s rule
│  │     └─ L4: deferred response
│  └─ L2: tokens
│     ├─ L3: 15-min interaction token
│     │  └─ L4: follow-up
│     └─ L3: bot token
│        └─ L4: Bearer
└─ L1: 9router application
   ├─ L2: notify action
   │  ├─ L3: discord://id/token
   │  │  └─ L4: R14 notify
   │  ├─ L3: {content} v1
   │  │  └─ L4: truncate 2000
   │  └─ L3: {embeds} v2
   │     └─ L4: color-coded severity
   ├─ L2: Slack-compatible
   │  ├─ L3: POST to /slack endpoint
   │  │  └─ L4: reuse Slack formatter
   │  └─ L3: Apprise parity
   │     └─ L4: same URL scheme
   └─ L2: inbound (v2)
      ├─ L3: interactions receiver
      │  └─ L4: R01 endpoint
      └─ L3: Ed25519 verify
         └─ L4: node:crypto
```

## R17 — Telegram integration

```
L0 R17: TELEGRAM INTEGRATION
├─ L1: bot API
│  ├─ L2: sendMessage
│  │  ├─ L3: https://api.telegram.org/bot<token>/sendMessage
│  │  │  ├─ L4: token in path
│  │  │  │  ├─ L5: POST JSON
│  │  │  │  └─ L5: no auth header
│  │  │  └─ L4: params
│  │  │     ├─ L5: chat_id
│  │  │     │  └─ L6: user/group/channel
│  │  │     ├─ L5: text
│  │  │     │  └─ L6: 4096 chars
│  │  │     ├─ L5: parse_mode
│  │  │     │  ├─ L6: Markdown
│  │  │     │  ├─ L6: MarkdownV2
│  │  │     │  └─ L6: HTML
│  │  │     ├─ L5: disable_web_page_preview
│  │  │     ├─ L5: reply_markup
│  │  │     │  └─ L6: inline keyboards
│  │  │     └─ L5: protect_content
│  │  └─ L3: response
│  │     ├─ L4: {ok: true, result: {message_id}}
│  │     └─ L4: error codes
│  │        └─ L5: 400 chat not found
│  ├─ L2: chat_id targeting
│  │  ├─ L3: user ID (positive)
│  │  │  └─ L4: DM
│  │  ├─ L3: group ID (negative)
│  │  │  └─ L4: -100 prefix for supergroups
│  │  └─ L3: channel username (@channel)
│  │     └─ L4: public
│  ├─ L2: rate limits
│  │  ├─ L3: ~30 msg/sec
│  │  │  └─ L4: batch
│  │  └─ L3: 429 retry_after
│  │     └─ L4: honor
│  └─ L2: formatting
│     ├─ L3: Markdown
│     │  └─ L4: *bold* _italic_ `code`
│     ├─ L3: MarkdownV2
│     │  └─ L4: escaping required
│     └─ L3: HTML
│        └─ L4: <b> <i> <code>
├─ L1: inbound (getUpdates / webhook)
│  ├─ L2: setWebhook
│  │  ├─ L3: public URL required
│  │  │  └─ L4: tunnel
│  │  └─ L3: secret_token
│  │     ├─ L4: X-Telegram-Bot-Api-Secret-Token
│  │     │  └─ L5: header check
│  │     └─ L4: 1-256 chars
│  ├─ L2: getUpdates (long polling)
│  │  ├─ L3: no public URL
│  │  │  └─ L4: local gateway friendly
│  │  ├─ L3: offset param
│  │  │  └─ L4: ack by offset
│  │  └─ L3: timeout param
│  │     └─ L4: long poll 50s
│  └─ L2: update types
│     ├─ L3: message
│     ├─ L3: callback_query
│     │  └─ L4: button presses
│     └─ L3: edited_message
└─ L1: 9router application
   ├─ L2: notify action
   │  ├─ L3: tgram://bottoken/chatid
   │  │  └─ L4: R14 notify
   │  ├─ L3: {chat_id, text}
   │  │  └─ L4: parse_mode Markdown
   │  └─ L3: truncate 4096
   │     └─ L4: split long
   ├─ L2: inbound (v2)
   │  ├─ L3: getUpdates long-poll
   │  │  └─ L4: no tunnel
   │  └─ L3: secret_token check
   │     └─ L4: R05 auth
   └─ L2: interactive (v2)
      ├─ L3: inline keyboards
      │  └─ L4: approve/deny actions
      └─ L3: callback_query
         └─ L4: rule trigger
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R15-L6-1 | hooks.slack.com/services/T/B/X; token in path | Slack Incoming Webhooks |
| R15-L6-2 | {text} markdown v1; {blocks} rich v2 | Slack Blocks API |
| R15-L6-3 | 30k events/hr workspace cap; batch/dedupe | Slack rate limits |
| R15-L6-4 | HMAC v0:timestamp:raw_body, 5-min tolerance | Slack Events API |
| R15-L6-5 | Retries ×3 with x-slack-retry-num; dedupe | Slack |
| R15-L6-6 | Socket Mode = WebSocket, no public URL | Slack |
| R16-L6-1 | /webhooks/<id>/<token>; id+token in path | Discord |
| R16-L6-2 | content 2000 chars; embeds 10; color severity | Discord |
| R16-L6-3 | /slack endpoint = reuse Slack formatter | Discord |
| R16-L6-4 | Ed25519 signatures, 15-min tolerance | Discord interactions |
| R16-L6-5 | 30 req/min per webhook; honor 429 | Discord |
| R17-L6-1 | api.telegram.org/bot<token>/sendMessage | Telegram Bot API |
| R17-L6-2 | chat_id: user/group/channel | Telegram |
| R17-L6-3 | parse_mode Markdown/MarkdownV2/HTML | Telegram |
| R17-L6-4 | getUpdates long-poll = no public URL | Telegram |
| R17-L6-5 | secret_token header check | Telegram |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R15–R17)
- Prior 2-way spine: `2026-09-15-webhook-branch-b1a-messaging-platforms.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 C1–C3)
- HTTP client: `2026-09-15-webhook-exp-11-http-client-architecture.md` (R15–R16)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)