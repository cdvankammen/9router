# Message Capture & Log-Viewing — Interpretation Guide

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #messages #observability #error-inbox #reading-guide

> **What this is:** the one-page-to-understand-everything for the message-capture research set. Read this first, then the doc-by-doc, then the synthesis. It interprets — it does not replace — the research docs.

## The intent behind the research

The user wants 9Router's **Messages page** to be the best-in-class local LLM traffic viewer: every request/response captured at the wire, filterable on every dimension, organized per conversation, with an error inbox, AI analysis, notifications, and optional "ship logs elsewhere" export. The research surveyed the entire open-source landscape (giants + obscure projects + academic papers + community demand) to find what to **copy** (UX patterns, proven designs) and what to **avoid** (license traps, dead projects, heavy infra).

## The 6 research docs at a glance

| Doc | What it covers | Key takeaway |
|-----|----------------|--------------|
| `message-capture-log-viewing.md` (v1) | Survey: what 9Router already has + landscape overview | Capture already exists (`requestDetails` table); the **viewing layer** is missing |
| `message-capture-deep-research-v2.md` (v2) | Exhaustive pass: LLM platforms, gateways, log mgmt, error trackers, notifications | **Build in-app, copy proven UX, integrate nothing heavy**; Langfuse = best ship-out target |
| `message-capture-obscure-projects-v3.md` (v3) | Hidden gems: 20–1,500★ projects | cc-viewer, claude-code-trace (3-panel), recensa (FTS5), tokentap (dual export) |
| `message-capture-v4-deep-pass.md` (v4) | Deep pagination: ~90 more projects, 43 papers, community, storage-pattern synthesis | Definitive conversation-schema recommendation; error-inbox recipe (cluster → enrich → alert) |
| `message-capture-gaps-and-risks.md` | Gap analysis + risk register + decision log | 10 risks (perf, storage, privacy, streaming, RBAC, driver variance, migration, concurrency, UI, analyzer trust) + 7 open decisions |
| `message-viewer-design-philosophies.md` | Design philosophies + filter dimensions from 10 reference tools | 9Router is a **gateway** — it can capture gateway-only dimensions (API key, IP, route chain) no client-side tool can see |

## The one-paragraph summary

9Router already captures every request/response pair in a SQLite `requestDetails` table (when observability is enabled) — what's missing is the **viewing/organizing layer**. The research verdict: **build the Messages page in-app** by copying proven UX from Bruno/Hoppscotch (response tabs), mitmweb (master-detail), Sentry (error inbox grouping/triage), OpenObserve (histogram + facets), and HyperDX (property search); **don't pull in a heavy external stack** (Langfuse/OpenObserve stay as optional "ship logs elsewhere" export targets). Copy ideas from MIT/Apache-2.0 projects only (Apprise, ntfy, GlitchTip schema, agent-prism); avoid license traps (Graylog SSPL, Phoenix ELv2, Sentry FSL, TensorZero archived). The definitive schema: a **hybrid relational** model — a `messages` projection table (indexed columns for hot filters) + fat JSON stays in `requestDetails.data` (LangGraph-blob style) — with FTS5 search (LIKE fallback behind a capability probe), keyset pagination, retention janitor, and privacy sanitizers before any AI analysis.

## Reading order

1. `message-capture-log-viewing.md` — what exists today, what's missing (the gap)
2. `message-capture-deep-research-v2.md` — the landscape verdict (build in-app, copy UX)
3. `message-capture-obscure-projects-v3.md` — the hidden gems (specific copy targets)
4. `message-capture-v4-deep-pass.md` — the deep pass (schema synthesis, error-inbox recipe)
5. `message-viewer-design-philosophies.md` — the design principles (filter dimensions, gateway-only captures)
6. `message-capture-gaps-and-risks.md` — the risks + decisions (read before implementing)
7. `2026-09-15-message-capture-synthesis.md` — the distilled knowledge
8. `2026-09-15-message-capture-order-and-next-steps.md` — what to do next

## Key conclusions

1. **Build in-app, copy proven UX, integrate nothing heavy** (v2 §0)
2. **Hybrid relational schema**: `messages` projection table + fat JSON in `requestDetails.data` (v4 §5)
3. **Error inbox modeled on Sentry**: fingerprint grouping, triage workflow, frequency chart (v2 §4)
4. **Notifications via Apprise-style URLs** (one string per channel, 100+ services) or direct ntfy/Gotify/Slack webhooks (v2 §5)
5. **FTS5 search with LIKE fallback** behind a runtime capability probe (gaps R6, D1)
6. **Privacy first**: sanitize before any AI analysis; never send captured prompts to external models by default (gaps R3, D4)
7. **Langfuse as optional ship-out target** — but keep export platform-agnostic (gaps §1.4)
8. **Gateway-only dimensions** (API key, IP, route chain, combo decisions) are 9Router's unique advantage (design-philosophies §C)

## Next steps

See `2026-09-15-message-capture-order-and-next-steps.md` for the full build order. In short: the Messages page work is already planned in `../planning/messages-page-feature-spec.md` and `../planning/2026-09-15-message-driven-tools-implementation-plan.md` (code-bearing); the error inbox + notifications follow; ship-out (Langfuse/OpenObserve export) is deferred.

## Source docs

- `../research/message-capture-log-viewing.md`
- `../research/message-capture-deep-research-v2.md`
- `../research/message-capture-obscure-projects-v3.md`
- `../research/message-capture-v4-deep-pass.md`
- `../research/message-capture-gaps-and-risks.md`
- `../research/message-viewer-design-philosophies.md`