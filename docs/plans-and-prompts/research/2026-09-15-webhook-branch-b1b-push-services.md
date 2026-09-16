# Branch Research — B1b: Push Services (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #outbound #push #ntfy #gotify #apprise #binary-tree #branch-b1b

## Objective

Deep-dive the **push services** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers ntfy & Gotify (B1b1) and Apprise (B1b2), down to L6 leaves.

```
B1b PUSH SERVICES
├─ B1b1: NTFY & GOTIFY
│  ├─ B1b1L: ntfy
│  │  ├─ B1b1LL: topic=password, PUT/POST
│  │  └─ B1b1LR: action buttons, X-Delay, templates
│  └─ B1b1R: gotify
│     ├─ B1b1RL: appToken vs clientToken
│     └─ B1b1RR: X-Gotify-Key header
└─ B1b2: APPRISE
   ├─ B1b2L: universal adapter
   │  ├─ B1b2LL: one URL → 100+ services
   │  └─ B1b2LR: schema:// URL config
   └─ B1b2R: tag routing
      ├─ B1b2RL: OR/AND/priority/escalation chains
      └─ B1b2RR: 9router deferred spec alignment
```

## Codebase grounding

No outbound notification code exists in `src/` today. This branch covers the self-hosted push services (ntfy, Gotify) and the universal adapter (Apprise) that 9router's deferred notification spec references.

## External research

### B1b1LL — ntfy: topic=password, PUT/POST

- **Auth:** topic name IS the password — no sign-up, no tokens required. `PUT/POST ntfy.sh/<topic>`.
- **Self-hosted:** Go binary, single binary deploy, SQLite for message history.
- **Recommended:** 9router's `ntfy://mytopic` URL stores the topic; notifier sends `PUT ntfy.sh/<topic>` with title/priority/body.

### B1b1LR — ntfy: action buttons, X-Delay, templates

- **Action buttons (≤3):** `view` (open URL), `broadcast` (Android intent), `http` (POST, configurable method/headers/body), `copy` (clipboard).
- **X-Delay:** min 10s, max 3 days — scheduled delivery.
- **Templates:** github, grafana, alertmanager payloads.
- **Recommended:** v1 sends title + body + priority; v2 adds templates (Grafana-style JSON payload to ntfy template).

### B1b1RL — Gotify: appToken vs clientToken

- **Two token types:** `appToken` (sender — POST messages) vs `clientToken` (receiver — read messages via `/stream`).
- **Tokens shown once** on creation/rotation — security model.
- **Recommended:** 9router needs only `appToken` (sender); store in `gotify://hostname/appToken`.

### B1b1RR — Gotify: X-Gotify-Key header

- **Auth:** `X-Gotify-Key: <apptoken>` header, or `token` query param, or `Authorization: Bearer <token>`.
- **POST `/message`:** `{title, message, priority, extras}`.
- **Recommended:** `X-Gotify-Key` header; POST `{title, message, priority}` to `gotify://hostname/message?token=apptoken`.

### B1b2LL — Apprise: one URL → 100+ services

- **Apprise** (BSD-2, 17.3k★): one URL scheme → 100+ services (Slack, Discord, Telegram, Gotify, ntfy, Pushover, email/SMTP, Matrix, Signal, WhatsApp, WeChat, 46elks SMS, PagerDuty, Opsgenie, Jira).
- **URL format:** `schema://credentials/params` (e.g., `slack://webhook-id/webhook-token`, `ntfy://mytopic`, `tgram://bottoken/chatid`).
- **Recommended:** support Apprise-style URLs natively in 9router (no Python dependency). The URL format IS the spec — parse scheme → dispatch to platform-specific notifier.

### B1b2LR — schema:// URL config

- **Config:** URLs in YAML/TEXT config files or env vars (`APPRISE_URLS`); tags with priority + escalation chains.
- **Recommended:** URLs in settingsRepo: `settings.notifyUrls = ["ntfy://mytopic", "slack://webhook-url", ...]` — same as the deferred spec.

### B1b2RL — tag routing (OR/AND/priority/escalation)

- **Apprise tags:** OR logic (`-g devops -g admin`), AND logic (`-g devops,critical`), priority escalation (`-g alerts` dispatches priority-1 first, escalates on failure), exclusive (`-g "2:alerts"`), per-call retry (`-g "alerts:3"`).
- **9router event→channel mapping:** `events: {"provider.error": ["ntfy", "slack"], "quota.exhausted": ["ntfy", "slack", "tgram"]}`.
- **Recommended:** simple event→channel mapping v1 (the deferred spec shape); Apprise-style priority/escalation v2.

### B1b2RR — 9router deferred spec alignment

- **Spec (P3 deferred, now operationalized):** `messages-page-feature-spec.md` §6: "optional Apprise-style URL (`apprise://` string or webhook list) → Slack/Discord/ntfy/Gotify/Telegram out of the box; Alertmanager semantics: group by fingerprint, min-interval dedupe, silence window."
- **Recommended:** this branch IS the implementation of that spec. Apprise-style URLs + Alertmanager semantics (dedupe by fingerprint, min-interval) in the outbox worker.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| B1b1LL | `ntfy://topic` → PUT to topic (topic = password) | ntfy |
| B1b1LR | v1: title+body+prio; v2: templates + action buttons | ntfy |
| B1b1RL | `gotify://hostname/appToken` → X-Gotify-Key header | Gotify |
| B1b1RR | POST `{title, message, priority}` to `/message` | Gotify |
| B1b2LL | 9router implements URL scheme parser for 100+ targets | Apprise |
| B1b2LR | URLs in settingsRepo: `settings.notifyUrls = [...]` | Apprise, 9router deferred spec |
| B1b2RL | v1: event→channel mapping; v2: priority/escalation | Apprise tags, Alertmanager |
| B1b2RR | This branch operationalizes the P3-deferred spec | messages-page-feature-spec.md §6 |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 C4 ntfy, C5 Gotify, C6 Apprise)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3 notify action, M4 outbound)