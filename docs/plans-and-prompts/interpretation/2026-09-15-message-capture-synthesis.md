# Message Capture & Log-Viewing — Synthesis

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #messages #observability #synthesis

> The distilled knowledge from the 6 message-capture research docs. If you read only one interpretation doc, read this one.

## Verdict

**Build the Messages page in-app, copy proven UX, integrate nothing heavy.** 9Router already captures every request/response pair at the wire (the gateway choke point); what's missing is the viewing/organizing layer. No external stack (Langfuse, OpenObserve, SigNoz) is worth pulling in for v1 — they remain optional "ship logs elsewhere" export targets.

## The 10 copy targets (what to steal)

| Pattern | From | Where it goes |
|---------|------|---------------|
| Response tabs (Pretty JSON / Raw / Preview / Headers / cURL) | Bruno / Hoppscotch | Message detail drawer |
| Master-detail flow layout | mitmweb | Messages page |
| Histogram + field filters | OpenObserve | Messages page top |
| Property search (`level:err`) | HyperDX | Search bar |
| Error grouping/triage workflow | Sentry | Error inbox |
| 3-panel layout (session tree → turns → detail) | claude-code-trace | Conversation view (2-panel default, 3-panel opt-in) |
| FTS5 search with snippet highlighting | recensa / claudex | Search |
| Body-diff collapsing | cc-viewer | Long agent sessions |
| Markdown + JSON dual export | tokentap | Export |
| One-URL-per-channel notifications | Apprise | Notifications |

## The architecture (settled by research)

**Hybrid relational schema** (v4 §5, gaps D2):
- New `messages` projection table — indexed columns for hot filters (status, model, provider, conversationId, errorCategory, latency, tokens, cost, sourceApp, clientTool, ide, truncated)
- Fat JSON stays in `requestDetails.data` (LangGraph-blob style) — lazy join for the detail pane
- No backfill of pre-existing rows — start clean

**Search:** FTS5 primary, LIKE fallback behind a runtime capability probe (`PRAGMA compile_options`) — driver chain variance (bun:sqlite → better-sqlite3 → node:sqlite → sql.js) makes FTS5 availability uneven.

**Pagination:** Keyset (`created_at, id`), never OFFSET. List queries select only `messages` columns + lazy `requestDetails` join.

**Retention:** Raw N days (default 7) → aggregated rollup forever; `maxJsonSize` caps with `truncated:true` flag; "wipe all messages" action; backups exclude `messages` like `requestDetails`.

**Concurrency:** Single-writer discipline — message row written in the same flush transaction as `requestDetails`; WAL mode + busy_timeout.

**Migration:** Additive-only (new tables/columns/indexes, no alters on `requestDetails`); test against a fixture DB copied from a v2 install; `VACUUM INTO` backups before migrate.

## The error inbox (Sentry model)

- **Fingerprint grouping** (hash of class+message+stack — Errbit's model is the simplest)
- **Triage workflow**: unresolved / resolved / ignored
- **Frequency chart** + user counts (blast radius at a glance)
- **Breadcrumbs** — chronological timeline of what happened before the error
- **Event Highlights** — curated tags/contexts promoted to the top
- **Recipe**: cluster → enrich → alert (airweave-ai error-monitoring-agent)
- **Analyzer trust**: advisory-only output with confidence signals + provenance labels; **never auto-close** without human confirmation

## The 7 decisions (from gaps doc)

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | FTS5 vs LIKE search | **Both** — FTS5 primary, LIKE fallback behind capability probe |
| D2 | New `messages` table vs extending `requestDetails` | **New projection table** (settled) |
| D3 | Webhook vs in-app notifications first | **In-app first** (badge/error-inbox), webhook as same-phase follow-on |
| D4 | Synthetic scan model | **Local-first** (Ollama), settings-gated, off by default; rules pre-filter, LLM on survivors |
| D5 | IP/agent/project capture timing | **P3** — but additive migration now so P3 is column-only |
| D6 | Retention strategy | **Raw N days → aggregated forever** (default 7 days), configurable, "wipe all" |
| D7 | Labeled failure corpus | **Seed synthetic during dev, harvest real from inbox post-launch** |

## The 10 risks (from gaps doc)

| # | Risk | Mitigation |
|---|------|------------|
| R1 | Performance at scale | Keyset pagination, lazy join, pre-aggregated counters |
| R2 | Storage growth | maxJsonSize caps, retention janitor, wipe-all action |
| R3 | Privacy / prompt injection | Sanitize before any AI analysis; `x-9r-privacy: redact\|off` tiers; system-prompt ACLs |
| R4 | Streaming capture gaps | Stream ending without terminal event = `error(truncated)`, never `done` |
| R5 | Role-based access | Ship under existing dashboard auth; roles later |
| R6 | DB driver variance | FTS5 capability probe + LIKE fallback |
| R7 | Migration risk | Additive-only, fixture test, VACUUM INTO backup |
| R8 | Concurrency | Single-writer flush transaction |
| R9 | UI complexity | 2-panel default, 3-panel opt-in |
| R10 | Analyzer trust | Advisory-only, never auto-close, build failure corpus |

## Gateway-only dimensions (9Router's unique advantage)

No client-side SDK instrumentation can see these — 9Router can capture them from the wire:
- API key used
- Client IP + UA
- Combo name + smart-router task type
- Fallback chain (attempts)
- Provider account
- Custom headers (trusted `X-9R-App/User/Session` post-auth)
- Route chain

## License guardrails

- **Copy ideas from**: MIT/Apache-2.0 only (Apprise, ntfy, GlitchTip schema, agent-prism, cc-viewer, claude-code-trace, recensa, tokentap)
- **Avoid**: Graylog (SSPL), Sentry self-host (FSL + 20 containers), Phoenix (ELv2), LangWatch (ELv2), Axiom (self-host discontinued), Pipedream, TensorZero (archived), llm.report (GPL, archived)
- **Pattern-only** (study UI, never vendor code): octopus (AGPL), Helicone ai-gateway (AGPL), nullsink (AGPL)

## Open questions (not yet decided)

1. Reddit demand signals — unverified (IP-blocked); verify manually before citing as evidence
2. OTel semconv churn — freeze a minimal documented subset for P4 export; re-verify at P4 start
3. Langfuse cost-modeling issues (#14265, #13792/#8020) — keep export under our control
4. Annotations/saved views retention — orphan cleanup vs FK cascade (ADR needed)

## Source docs

- `../research/message-capture-log-viewing.md`
- `../research/message-capture-deep-research-v2.md`
- `../research/message-capture-obscure-projects-v3.md`
- `../research/message-capture-v4-deep-pass.md`
- `../research/message-capture-gaps-and-risks.md`
- `../research/message-viewer-design-philosophies.md`