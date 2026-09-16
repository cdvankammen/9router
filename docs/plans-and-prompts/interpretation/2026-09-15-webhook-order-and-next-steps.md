# Webhook Receive & Act — Order & Next Steps

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #webhook #order #next-steps #timeline

---

## Purpose

This doc answers two questions: **what order did the work happen in** (so you understand why the docs look the way they do), and **what order should things happen next** (so you know what to do with the research). It is the "organized order" view of the entire webhook body of work.

---

## Part A — Chronological Timeline (What Happened, In Order)

| When | What happened | Why | Docs produced |
|------|---------------|-----|---------------|
| 2026-09-15 (early) | User asked: does 9router have webhook receive/act? If not, research all options at min binary-tree depth 5, then depth 6 | Establish the facts + landscape | `research/2026-09-15-webhook-receive-act-research.md` (48KB), `planning/2026-09-15-webhook-receive-act-plan.md` |
| 2026-09-15 (mid) | User clarified "binary tree" = recursive 2-way expansion (each finding → 2 children × 6 levels) | The first tree format was 2-way | `research/2026-09-15-webhook-master-research-tree.md` + 8 branch docs |
| 2026-09-15 (late) | User clarified "binary tree" again = TRUE exponential N-ary (every phrase = root, N children, 6 levels) | The real intent was exponential | `research/2026-09-15-webhook-exponential-master-map.md` + 11 exp branch docs |
| 2026-09-15 (final) | User asked for interpretation: make the research understandable, organized, readable | The research was dense; needed a map | `interpretation/` — 4 docs (this layer) |

**Key principle:** Every phase was **additive** — nothing was removed. The flat research, 2-way tree, and exponential tree all coexist. They are three layers of the same research:

```
Layer 1: Flat research (the foundation)     — 1 doc + 1 plan
Layer 2: 2-way binary tree (the spine)      — 1 master tree + 8 branch docs
Layer 3: Exponential N-ary (the full body)  — 1 master map + 11 branch docs
Layer 4: Interpretation (the map)           — 4 docs (this layer)
```

---

## Part B — Logical Reading Order (How to Understand It)

### Level 0 — 5 minutes: The interpretation layer
1. `./2026-09-15-webhook-interpretation-guide.md` — one-page summary, doc map, key conclusions
2. `./2026-09-15-webhook-synthesis.md` — distilled knowledge (verdict, archetypes, architecture, decisions)

### Level 1 — 30 minutes: The foundation
3. `../research/2026-09-15-webhook-receive-act-research.md` — Parts 3 (taxonomy), 4 (architecture), 5 (decisions)
4. `../planning/2026-09-15-webhook-receive-act-plan.md` — M1–M5 milestones

### Level 2 — 2 hours: The 2-way tree (the readable spine)
5. `../research/2026-09-15-webhook-master-research-tree.md` — the map
6. The 8 branch docs (`../research/2026-09-15-webhook-branch-*.md`) — each a 7-node subtree

### Level 3 — Deep dive: The exponential tree (the full body)
7. `../research/2026-09-15-webhook-exponential-master-map.md` — the map (48 roots)
8. The 11 exp branch docs (`../research/2026-09-15-webhook-exp-*.md`) — full N-ary trees

### Level 4 — History: The tracking layer
9. `../tracking/TASKS.md` — webhook sections (R1–R6, T1–T9, E1–E12)
10. `../tracking/CHANGELOG.md` — 2026-09-15 entries
11. `../tracking/SESSION-HISTORY.md` — 3 webhook sessions
12. `../tracking/SESSION-NARRATIVE.md` — PART 8, 9, 11

---

## Part C — Build Order (What to Do Next)

**Status: research complete, implementation deferred — awaiting user go-ahead.**

When implementation starts, follow the plan's milestones in order. Each milestone has acceptance criteria in the plan doc.

### M1 — Inbound receiver + HMAC (first, everything depends on it)
- `src/app/api/webhooks/[id]/route.js` (POST, raw body, HMAC verify)
- `src/lib/webhooks/verify.js` (Standard Webhooks spec)
- `src/lib/webhooks/registry.js` (config CRUD)
- Settings: `webhooks`, `webhookRules`, `notifyUrls` in `settingsRepo.js`
- **Research to consult:** `exp-01-receiver-transport.md` (R01–R04), `exp-02-auth-secrets.md` (R05–R08), `branch-a1a-transport.md`, `branch-a1b-auth-security.md`

### M2 — SQLite outbox + worker (second, enables async processing)
- Migration: `webhook_events` table
- `src/lib/db/repos/webhookEventsRepo.js`
- Worker in `src/instrumentation.js` (settings-gated)
- **Research to consult:** `exp-03-event-store-worker.md` (R09–R11), `branch-a2a-event-store.md`

### M3 — Rule engine + actions (third, the "things happen" half)
- `src/lib/webhooks/rules.js` (matching + dispatch)
- Action modules: notify, http, llm, gateway, dashboard
- Rules in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`
- **Research to consult:** `exp-04-rule-engine-actions.md` (R12–R14), `branch-a2b-rule-engine.md`

### M4 — Outbound triggers (fourth, makes it useful)
- Wire `quotaAutoPing.js` → quota events (80/90/exhausted)
- Wire `chatCore.js` → provider.error / fallback.used
- Emitter → outbox
- **Research to consult:** `exp-05-messaging-platforms.md` (R15–R17), `exp-06-push-services.md` (R18–R20), `exp-07-internal-events.md` (R21–R23), `exp-08-scheduled-monitoring.md` (R24–R25), `branch-b1a-messaging-platforms.md`, `branch-b1b-push-services.md`, `branch-b2a-internal-events.md`, `branch-b2b-scheduled-monitoring.md`

### M5 — Dashboard UI (P2, last, polish)
- Webhook config page, rules editor, event log viewer
- **Research to consult:** `exp-01-receiver-transport.md` (endpoint lifecycle section)

---

## Part D — What's Deferred (Documented, Not Started)

| Item | Where documented | Why deferred |
|------|------------------|--------------|
| All M1–M5 implementation | `planning/2026-09-15-webhook-receive-act-plan.md` | Awaiting user go-ahead |
| Visual workflow editor (n8n-style) | Plan "Out of scope (v1)" | JSON rules first |
| Long-polling Mode B (Telegram model) | Plan "Out of scope (v1)" | Tunnel assumed available; revisit if needed |
| Socket Mode / WebSocket inbound | Plan "Out of scope (v1)" | HTTP only |
| Dead man's switch (Healthchecks.io model) | Plan "Out of scope (v1)" | Separate feature |
| Apprise as a dependency | Plan "Out of scope (v1)" | Implement URL schemes natively |
| Apprise notifications (messages-page spec §6) | `planning/messages-page-feature-spec.md` §6 | P3 — now operationalized by the webhook research |
| Quota webhook alerts (gitbook spec) | `gitbook/content/en/features/quota-tracking.md` | Aspirational — now operationalized by M4 |

---

## Part E — Decision Points Still Open (Need User Input)

1. **Tunnel vs local-only:** Expose webhooks via tunnel (cloudflare/tailscale) or keep localhost-only? (HMAC needed either way)
2. **Apprise dependency vs native schemes:** Add Apprise as a dependency, or implement URL schemes natively (plan says native)?
3. **Priority:** Which milestone to start with when implementation begins? (Plan says M1 → M5)
4. **Scope of M5:** Is the dashboard UI (P2) wanted in the first pass, or later?

---

## Related Docs

- Interpretation: `./2026-09-15-webhook-interpretation-guide.md`, `./2026-09-15-webhook-doc-by-doc.md`, `./2026-09-15-webhook-synthesis.md`
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md`
- Research: `../research/2026-09-15-webhook-receive-act-research.md`, `../research/2026-09-15-webhook-master-research-tree.md`, `../research/2026-09-15-webhook-exponential-master-map.md`
- Tracking: `../tracking/TASKS.md`, `../tracking/CHANGELOG.md`, `../tracking/SESSION-HISTORY.md`, `../tracking/SESSION-NARRATIVE.md`