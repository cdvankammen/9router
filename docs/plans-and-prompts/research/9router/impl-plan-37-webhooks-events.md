---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, webhooks, events, notifications, integrations
---

# Implementation Plan 37 — Webhooks & Event Notifications

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "webhooks/events" option: event-driven notifications and integrations.

## 1. Goal

Add webhooks and event notifications to 9Router: configurable webhooks for routing events, usage alerts, error alerts, and provider health — enabling external integrations.

## 2. Background (from research)

- **9Router current state**: no webhook system; LiteLLM has Slack/webhook alerting (research finding).
- **Research findings**: webhooks enable external monitoring; event types (usage, errors, health) need different channels; retry + signing needed for reliability.

## 3. Design

### 3.1 Event System

- **Event types**: usage (request, cost), errors (rate_limit, auth, timeout), health (provider up/down), routing (fallback, combo).
- **Event schema**: type, timestamp, payload, severity.
- **Event bus**: in-process event bus with subscribers.

### 3.2 Webhook Delivery

- **Webhook config**: URL, events, secret, retry policy.
- **Delivery**: POST with HMAC signature.
- **Retry**: exponential backoff; dead-letter after N.
- **Delivery log**: delivery attempts + outcomes.

### 3.3 Notification Channels

- **Webhooks**: generic HTTP.
- **Slack**: Slack message format.
- **Email**: SMTP (optional).
- **Dashboard**: in-app notifications.

### 3.4 Alerting

- **Alert rules**: threshold-based (cost spike, error rate, provider down).
- **Alert actions**: webhook + channel.
- **Alert suppression**: dedupe + cooldown.

## 4. Implementation Steps

1. Build event bus.
2. Add webhook delivery (signing, retry).
3. Add notification channels.
4. Add alert rules.
5. Build webhook management UI.
6. Tests: events, delivery, retry, alerts.

## 5. Files Touched

- `src/lib/events/` (new: bus, webhooks, alerts)
- `src/app/api/v1/webhooks/route.js` (new)
- Dashboard webhooks page (new)
- `src/lib/db/repos/webhookRepo.js` (new)
- `tests/unit/webhooks.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Delivery failures | Retry + dead-letter |
| Webhook storms | Dedupe + cooldown |
| Security | HMAC signing; secret rotation |
| Event volume | Filtering; sampling |

## 7. Success Criteria

- Events emitted for key types.
- Webhooks delivered with signing + retry.
- Alerts configurable.
- Delivery log visible.

## 8. Related Plans
- Plan 8 (Observability) — event source.
- Plan 9 (Error System) — error events.
- Plan 4 (Cost-Quality) — cost alerts.