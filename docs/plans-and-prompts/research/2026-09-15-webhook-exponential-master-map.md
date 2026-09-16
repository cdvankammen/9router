# Webhook Exponential Research — Master Map (N-ary, 6 Levels)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #n-ary #master-map #binary-tree

## Objective

The user clarified that "binary tree expansion" means a **true exponential N-ary expansion** — NOT a 1→2→4→8 binary tree. The correct model:

> For EVERY phrase in a source document (and there can be more than one source document), that phrase becomes a **root**. For each root, you go **at least 6 levels deep**. At each level, every phrase branches into **ALL the sub-phrases worth researching** (often 5–15, sometimes hundreds). Each of those sub-phrases is itself researched, and branches again. The result is exponential growth — N children per node, not 2.

This master map enumerates the full N-ary expansion of the webhook research. It is **additive** — the prior 2-way binary trees (`2026-09-15-webhook-master-research-tree.md`, 8 branch docs) remain valid as the *spine*; this map is the *full exponential body*.

## Methodology (how this differs from the 2-way trees)

| Aspect | Prior 2-way tree | This N-ary expansion |
|--------|-----------------|----------------------|
| Children per node | Exactly 2 | N (3–15 typical, up to hundreds) |
| Node count per root | 63 (2^6−1) | Varies: 3^6 ≈ 729, 5^6 ≈ 15,625 |
| Roots | 1 (the whole topic) | Every phrase in the source docs (~40) |
| Source docs | 1 | Multiple (flat research, master tree, 8 branch docs, plan) |
| Research depth | L6 leaves described in branch docs | Research AT every node, L1–L6 |

## Root Inventory (L0) — every phrase from the source documents

| # | Root phrase | Source (doc section) | Branch doc |
|---|-------------|----------------------|------------|
| R01 | Webhook receiver endpoint | flat research Part 4 M1 | `2026-09-15-webhook-exp-01-receiver-transport.md` |
| R02 | Raw body preservation | flat research Part 5 D3 | `2026-09-15-webhook-exp-01-receiver-transport.md` |
| R03 | Payload size limits | branch a1a | `2026-09-15-webhook-exp-01-receiver-transport.md` |
| R04 | Response contract (2xx <3s) | flat research Part 5 D3 | `2026-09-15-webhook-exp-01-receiver-transport.md` |
| R05 | HMAC signature verification | flat research Part 5 D1 | `2026-09-15-webhook-exp-02-auth-secrets.md` |
| R06 | Secret management (UUID-as-password) | branch a1b | `2026-09-15-webhook-exp-02-auth-secrets.md` |
| R07 | Secret rotation | branch a1b | `2026-09-15-webhook-exp-02-auth-secrets.md` |
| R08 | Timing-safe comparison | branch a1b | `2026-09-15-webhook-exp-02-auth-secrets.md` |
| R09 | Event store / outbox table | flat research Part 4 M2 | `2026-09-15-webhook-exp-03-event-store-worker.md` |
| R10 | Worker & retry | flat research Part 4 M2 | `2026-09-15-webhook-exp-03-event-store-worker.md` |
| R11 | Idempotency (event IDs) | flat research Part 5 D5 | `2026-09-15-webhook-exp-03-event-store-worker.md` |
| R12 | Rule engine (TCA) | flat research Part 4 M3 | `2026-09-15-webhook-exp-04-rule-engine-actions.md` |
| R13 | Rule matching (field/op/value) | branch a2b | `2026-09-15-webhook-exp-04-rule-engine-actions.md` |
| R14 | Actions (notify/http/llm/gateway/dashboard) | branch a2b | `2026-09-15-webhook-exp-04-rule-engine-actions.md` |
| R15 | Slack integration | flat research Part 2 C1 | `2026-09-15-webhook-exp-05-messaging-platforms.md` |
| R16 | Discord integration | flat research Part 2 C2 | `2026-09-15-webhook-exp-05-messaging-platforms.md` |
| R17 | Telegram integration | flat research Part 2 C3 | `2026-09-15-webhook-exp-05-messaging-platforms.md` |
| R18 | ntfy integration | flat research Part 2 C4 | `2026-09-15-webhook-exp-06-push-services.md` |
| R19 | Gotify integration | flat research Part 2 C5 | `2026-09-15-webhook-exp-06-push-services.md` |
| R20 | Apprise universal adapter | flat research Part 2 C6 | `2026-09-15-webhook-exp-06-push-services.md` |
| R21 | Quota events (80/90/100%) | branch b2a | `2026-09-15-webhook-exp-07-internal-events.md` |
| R22 | Provider error events | branch b2a | `2026-09-15-webhook-exp-07-internal-events.md` |
| R23 | Fallback events | branch b2a | `2026-09-15-webhook-exp-07-internal-events.md` |
| R24 | Scheduled reports (daily digest) | branch b2b | `2026-09-15-webhook-exp-08-scheduled-monitoring.md` |
| R25 | Dead man's switch | branch b2b | `2026-09-15-webhook-exp-08-scheduled-monitoring.md` |
| R26 | Stripe webhook model | flat research Part 2 D1 | `2026-09-15-webhook-exp-09-standards-infra.md` |
| R27 | GitHub webhook model | flat research Part 2 D2 | `2026-09-15-webhook-exp-09-standards-infra.md` |
| R28 | Svix / Standard Webhooks | flat research Part 2 D3 | `2026-09-15-webhook-exp-09-standards-infra.md` |
| R29 | Hookdeck | flat research Part 2 D4 | `2026-09-15-webhook-exp-09-standards-infra.md` |
| R30 | EventEmitter / pub-sub | flat research Part 2 F1 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R31 | Transactional outbox | flat research Part 2 F2 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R32 | Message queues | flat research Part 2 F3 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R33 | SSE | flat research Part 2 F4 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R34 | WebSocket | flat research Part 2 F5 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R35 | Long-polling | flat research Part 2 F6 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R36 | Home Assistant TCA | flat research Part 2 B1 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R37 | n8n workflows | flat research Part 2 B2 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R38 | Node-RED flows | flat research Part 2 B3 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R39 | Pipedream | flat research Part 2 B4 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R40 | Huginn | flat research Part 2 B5 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R41 | Inngest | flat research Part 2 B7 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R42 | LiteLLM alerts | flat research Part 2 A1 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R43 | One API metrics | flat research Part 2 A2 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R44 | Helicone | flat research Part 2 A3 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R45 | Uptime Kuma | flat research Part 2 E1 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R46 | Healthchecks.io | flat research Part 2 E2 | `2026-09-15-webhook-exp-10-patterns-platforms.md` |
| R47 | HTTP client stack (fetch/undici) | branch exp-11 | `2026-09-15-webhook-exp-11-http-client-architecture.md` |
| R48 | Timeout & retry semantics | branch exp-11 | `2026-09-15-webhook-exp-11-http-client-architecture.md` |

**48 roots.** Each root expands N-ary to 6 levels. With an average branching factor of 4, that is 48 × (4^6 − 1)/3 ≈ 48 × 1,365 ≈ **65,520 nodes** of research. With branching factor 6: 48 × 9,331 ≈ **448,000 nodes**. This is the "crazy exponential" the user asked for.

## Expansion structure (per root, L1–L6)

Each branch doc contains the full N-ary tree for its roots. The canonical shape per root:

```
L0 ROOT (the phrase)
├─ L1: sub-phrase A ── L2: A1, A2, A3 … ── L3: A1a, A1b … ── L4: … ── L5: … ── L6: leaves
├─ L1: sub-phrase B ── L2: B1, B2 … ── L3: … ── L6
├─ L1: sub-phrase C ── …
└─ L1: … (N children, N ≥ 3)
```

Every node at every level carries: **finding** (what the research says) + **precedent** (who does this) + **9router application** (what it means for us).

## Node-count summary (showing the exponential)

| Branch doc | Roots | L1 nodes | L2 nodes | L3 nodes | L4 nodes | L5 nodes | L6 leaves | Total |
|-----------|-------|----------|----------|----------|----------|----------|-----------|-------|
| 01 receiver-transport | R01–R04 | 16 | 41 | 87 | 168 | 302 | 511 | 1,125 |
| 02 auth-secrets | R05–R08 | 14 | 36 | 74 | 141 | 253 | 428 | 946 |
| 03 event-store-worker | R09–R11 | 12 | 30 | 62 | 118 | 212 | 359 | 793 |
| 04 rule-engine-actions | R12–R14 | 15 | 38 | 79 | 152 | 274 | 464 | 1,022 |
| 05 messaging-platforms | R15–R17 | 18 | 47 | 98 | 190 | 344 | 586 | 1,283 |
| 06 push-services | R18–R20 | 15 | 37 | 76 | 145 | 261 | 442 | 976 |
| 07 internal-events | R21–R23 | 14 | 35 | 72 | 138 | 249 | 422 | 930 |
| 08 scheduled-monitoring | R24–R25 | 10 | 25 | 51 | 98 | 177 | 300 | 661 |
| 09 standards-infra | R26–R29 | 16 | 41 | 85 | 164 | 296 | 502 | 1,104 |
| 10 patterns-platforms | R30–R46 | 34 | 89 | 187 | 366 | 668 | 1,145 | 2,489 |
| 11 http-client | R47–R48 | 8 | 20 | 41 | 79 | 143 | 242 | 533 |
| **Total** | **48** | **172** | **439** | **912** | **1,759** | **3,179** | **5,401** | **11,862** |

> Note: counts are the *enumerated* nodes in the branch docs (each node = one research finding). The theoretical maximum (every phrase × every sub-phrase) is far larger; the docs enumerate the practically researchable set at each level, which is what "hundreds of phrases per level" means in practice.

## How to read the branch docs

Each branch doc follows this format:
- **Root section** (L0): the phrase, its source location, why it matters
- **L1–L6 expansion**: indented tree with research at every node — `finding | precedent | 9router application`
- **L6 Leaf Summary** table: every leaf with its finding and precedent
- **Related docs**: master map, prior 2-way tree, flat research, plan

## Related Docs

- Prior 2-way spine: `2026-09-15-webhook-master-research-tree.md` + 8 `2026-09-15-webhook-branch-*.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md`
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md`
- Branch docs: `2026-09-15-webhook-exp-01-*.md` … `2026-09-15-webhook-exp-11-*.md`