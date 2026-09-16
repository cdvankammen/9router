# ADR-010: Message-Driven Tool-Building — Hybrid Facet + JSON-Path Design

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** proposed
**Tags:** #decision #architecture #observability #messages #filter #build #record

## Context

The research doc `38-message-driven-tools-research.md` identified that 9Router captures a rich `requestDetails.data` blob (~30+ fields) per request, but only ~10 fixed dimensions are filterable server-side. The user's goal: make **every field** a first-class dimension for Filter / Build / Record / More options. Four design options were considered (fixed-filter API extension, JSON-path query language, extract-and-index layer, hybrid).

## Decision

**Adopt Option 4 — Hybrid: extract-and-index for the hot path + JSON-path for the long tail.**

1. **Hot path (Option 3):** a `message_facets` table populated at capture time with the top ~15 dimensions users actually filter on (`has_tools`, `tool_count`, `has_thinking`, `thinking_tokens`, `image_count`, `truncated`, `latency_ms`, `prompt_tokens`, `completion_tokens`, `cost_usd`, `source_app`, `client_tool`, `ide`, `error_category`, `request_params` JSON). Indexed columns → fast, pagination-correct filtering + facet counts.
2. **Long tail (Option 2):** a `jsonPath` query parameter using SQLite JSON1 (`json_extract`) for arbitrary queries on `data` — parameterized only, whitelisted operators, rate-limited.
3. **Identity:** `client_tool` + `ide` facets from an extended `detectClientTool` (governance M1 list + IDE detection); trusted `X-9R-App/User/Session` headers consumed post-auth (governance M1 dependency).
4. **Build/Record:** `message_annotations` (tag/star/note), `saved_views`, per-message actions, webhook/script hooks with template expansion, conversation-level tooling.

## Why (evidence)

- Mirrors the existing pattern: `requestDetails` columns for hot filters + `data` JSON for everything else (ADR-007).
- The error inbox already uses SQL aggregation + JSON1 filtering — proven pattern in this codebase.
- Capture-time facets are fast and survive retention; query-time JSON-path covers the long tail without schema churn.
- Identity is the missing first-class dimension (research §B, §F); governance M1 already plans the trust model.

## Consequences

- New migration + capture-time schema maintenance (new fields need migration).
- JSON-path parser + validation needed (injection risk if not parameterized).
- Facets UI (counts per value) becomes possible, like the error inbox.
- Annotations/saved views need a retention story when `requestDetails` rows are dropped by the cap (orphan cleanup or FK cascade — open question, decide in implementation).
- Cloud sync of annotations/saved views deferred (local SQLite first).

## Alternatives Rejected

- **Option 1 (fixed-filter API extension)** — every new dimension = new param; doesn't scale to "everything in the message".
- **Option 2 alone (JSON-path only)** — no indexed hot path; slow for common filters; no facet counts.
- **Option 3 alone (extract-and-index only)** — capture-time schema must be maintained; new fields need migration; duplicates data already in `data`.

## Reversibility

Medium — additive tables/columns; can drop facets or jsonPath without touching existing data. The hybrid split (hot vs long-tail) is the reversible part; the capture-time schema is the committed part.

## References

- Research: `../research/9router/38-message-driven-tools-research.md` §E (design space)
- Plan: `../planning/message-driven-tools-plan.md`
- Prior capture research: `../research/message-capture-deep-research-v2.md`, `../research/message-capture-v4-deep-pass.md`
- Decisions: `ADR-007` (JSON blob vs table), `ADR-002` (conversation tracking)
- Governance: `../planning/2026-08-31-source-app-governance-plan.md` M1