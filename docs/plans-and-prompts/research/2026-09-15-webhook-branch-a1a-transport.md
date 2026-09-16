# Branch Research — A1a: Transport (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #inbound #transport #http #binary-tree #branch-a1a

## Objective

Deep-dive the **HTTP transport** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers request handling (A1a1) and raw body semantics (A1a2), down to L6 leaves.

```
A1a TRANSPORT — HTTP semantics
├─ A1a1: REQUEST HANDLING
│  ├─ A1a1L: methods & routes
│  │  ├─ A1a1LL: POST /api/webhooks/[id]
│  │  └─ A1a1LR: allowed_methods (Home Assistant)
│  └─ A1a1R: response contract
│     ├─ A1a1RL: 2xx <3s (Slack/Discord mandate)
│     └─ A1a1RR: challenge handshake (Slack url_verification)
└─ A1a2: RAW BODY
   ├─ A1a2L: req.text() pattern
   │  ├─ A1a2LL: raw body for HMAC (Svix/Next.js)
   │  └─ A1a2LR: JSON parse after verify
   └─ A1a2R: payload limits
      ├─ A1a2RL: size caps (n8n 16MB, Pipedream 512KB)
      └─ A1a2RR: large payload offload (Pipedream S3)
```

## Codebase grounding (what exists today)

### `src/app/api/*/route.js` — the route pattern (A1a1)

- 9router uses Next.js App Router route handlers: `export async function POST(request) { ... }` per file.
- Existing routes: `messages/`, `settings/`, `analyze-error/`, `tunnel/`, `v1/` (chat, embeddings, images, audio, messages, models, responses, search, videos, web).
- A new `src/app/api/webhooks/[id]/route.js` follows the exact same pattern — dynamic segment `[id]` for the webhook ID.
- `src/app/api/analyze-error/route.js` is the closest existing analog: it reads a JSON body, runs it through the internal routing pipeline (`handleChatCore`), and returns a result. A webhook route would do the same but with HMAC verification first.

### `src/lib/db/repos/settingsRepo.js` — config store (A1a1LR)

- `DEFAULT_SETTINGS` object holds all config; PATCH via `/api/settings`; `PROTECTED_SETTING_KEYS = ["password", "mitmSudoEncrypted"]`.
- Webhook config (IDs, secrets, rules, notify URLs) would live here as new keys.

## External research

### A1a1LL — POST /api/webhooks/[id]

- **Home Assistant** model: `POST /api/webhook/<webhook_id>` — the webhook ID is a unique UUID in the path, treated like a password. One webhook ID = one automation.
- **n8n** model: webhook node with Test URL + Production URL; path route params (`/:variable`).
- **Pipedream** model: HTTP trigger accepts ANY method/path/media type; `steps.trigger.event` = `{body, client_ip, headers, method, path, query, url}`.
- **Recommended for 9router:** `POST /api/webhooks/[id]` where `[id]` is a generated secret UUID (Home Assistant model). The route reads the raw body, verifies HMAC, enqueues the event, returns 2xx.

### A1a1LR — allowed_methods (Home Assistant)

- Home Assistant webhook triggers support `allowed_methods` (POST/PUT/HEAD/GET) — default POST.
- n8n supports DELETE/GET/HEAD/PATCH/POST/PUT per webhook node.
- **Recommended:** start with POST only (the universal webhook verb); add GET for health-check pings (Healthchecks.io model) later if needed.

### A1a1RL — 2xx <3s (Slack/Discord mandate)

- **Slack:** "Must respond 2xx within 3 seconds or event delivery is considered failed." Explicitly documented.
- **Discord:** "Must respond within 3 seconds" for interactions.
- **Pipedream:** `$.respond({immediate: true})` — ack-then-process pattern.
- **Stripe:** "Return 2xx fast before complex logic; process async (queue)."
- **Recommended:** the route does ONLY: verify HMAC → insert outbox row → return 200. All rule matching and actions happen in the worker. This is the single most important design rule.

### A1a1RR — challenge handshake (Slack url_verification)

- **Slack HTTP mode:** on webhook creation, Slack POSTs a `url_verification` event with a `challenge` field; the receiver must echo `challenge` back in the response body to prove the endpoint is live.
- **Discord:** PING (type 1) interaction → respond PONG (type 1).
- **Telegram:** `setWebhook` returns `ok: true` if the URL is reachable; `getWebhookInfo` for diagnostics.
- **Recommended:** support a `challenge` echo for Slack-style senders (cheap, makes 9router a drop-in Slack Events API receiver). The route checks for `type: "url_verification"` and echoes `challenge` before HMAC (Slack sends it without a signature).

### A1a2LL — raw body for HMAC (Svix/Next.js)

- **Svix/Standard Webhooks spec:** HMAC is computed over the **raw body** — `await req.text()` in Next.js App Router. Parsing JSON first (`req.json()`) breaks the signature because the body is re-serialized differently.
- **Stripe:** `signed_payload = timestamp + "." + raw body`.
- **Slack:** `v0:<timestamp>:<raw_body>`.
- **This is the #1 mistake** in webhook implementations. The route MUST read `req.text()` first, verify, THEN parse JSON.

### A1a2LR — JSON parse after verify

- After HMAC verification passes, `JSON.parse(rawBody)` for the event payload.
- Handle non-JSON content types: form data (Home Assistant routes to `trigger.data`), query params (`trigger.query`), multipart (Pipedream parses).
- **Recommended:** JSON first-class; form/query as fallback (Home Assistant model).

### A1a2RL — size caps

- **n8n:** 16MB cap (`N8N_PAYLOAD_SIZE_MAX`).
- **Pipedream:** 512KB default payload; 413 on exceed.
- **Slack:** no explicit cap documented but events are small.
- **Recommended:** 1MB default cap for 9router (covers all real webhook senders; n8n's 16MB is for workflow data, not webhooks). Return 413 on exceed.

### A1a2RR — large payload offload (Pipedream S3)

- **Pipedream:** up to 5TB via `pipedream_upload_body=1` or `x-pd-upload-body: 1`; large payloads saved to S3 with signed URLs (30-min expiry); the webhook event contains the URL, not the body.
- **Helicone:** `request_response_url` (S3 signed URL) expires in 30 min; 10KB payload truncation for the inline body.
- **Recommended:** for 9router v1, cap at 1MB and store the payload inline in SQLite (JSON column). S3 offload is only needed for multi-MB payloads — revisit if a use case appears.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| A1a1LL | `POST /api/webhooks/[id]`, secret UUID in path | Home Assistant, n8n, Pipedream |
| A1a1LR | POST only v1; GET for health pings later | Home Assistant allowed_methods |
| A1a1RL | Verify → enqueue → 200, all processing async | Slack 3s, Discord 3s, Pipedream, Stripe |
| A1a1RR | Echo `challenge` for Slack-style senders | Slack url_verification, Discord PING |
| A1a2LL | `req.text()` raw body for HMAC — never `req.json()` first | Svix, Stripe, Slack |
| A1a2RL | 1MB cap, 413 on exceed | n8n 16MB, Pipedream 512KB |
| A1a2RR | Inline SQLite storage v1; S3 offload later | Pipedream, Helicone |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 B1 Home Assistant, B2 n8n, B4 Pipedream; Part 2 D1 Stripe, D3 Svix; Part 2 C1 Slack)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)