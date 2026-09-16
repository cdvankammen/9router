# Message Capture & Log-Viewing — Order and Next Steps

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #messages #observability #order #next-steps

> The order of everything for the message-capture research: chronological timeline, logical reading order, build order, what's deferred, how to use the research during implementation.

## Chronological timeline (how the research happened)

| Date | Doc | What happened |
|------|-----|---------------|
| 2026-08-07 | `message-capture-log-viewing.md` (v1) | Survey: what exists + landscape overview |
| 2026-08-07 | `message-capture-deep-research-v2.md` (v2) | Exhaustive pass: 3 parallel research agents + direct repo deep-dives |
| 2026-08-07 | `message-capture-obscure-projects-v3.md` (v3) | Hidden gems pass (user directive: find obscure options) |
| 2026-08-07 | `message-capture-v4-deep-pass.md` (v4) | Deep pass: 5 subagents, ~90 projects, 43 papers, community |
| 2026-08-07 | `message-viewer-design-philosophies.md` | Design principles from 10 reference tools |
| 2026-08-07 | `message-capture-gaps-and-risks.md` | Gap analysis + risk register + decision log |
| 2026-09-15 | `2026-09-15-message-capture-*.md` (this set) | Interpretation layer |

## Logical reading order

1. `message-capture-log-viewing.md` — the gap (what exists, what's missing)
2. `message-capture-deep-research-v2.md` — the verdict (build in-app, copy UX)
3. `message-capture-obscure-projects-v3.md` — the copy targets (hidden gems)
4. `message-capture-v4-deep-pass.md` — the depth (schema, recipe, papers)
5. `message-viewer-design-philosophies.md` — the design (filter dimensions, gateway-only)
6. `message-capture-gaps-and-risks.md` — the risks + decisions
7. `2026-09-15-message-capture-synthesis.md` — distilled knowledge
8. `2026-09-15-message-capture-order-and-next-steps.md` — this doc

## Build order (what to do next)

### Phase 1 — Messages page (in-app, highest value)

Already planned in:
- `../planning/messages-page-feature-spec.md` (feature spec)
- `../planning/2026-09-15-message-driven-tools-implementation-plan.md` (**code-bearing** — M1 facets, M2 JSON-path, M3 identity, M4 annotations/saved views, M5 actions/hooks, M6 UI)

**Order within Phase 1:**
1. M1 facet extraction + indexing (hot path) — the schema foundation
2. M2 JSON-path query language (long tail) — arbitrary queries
3. M3 identity as first-class dimension (clientTool/ide/trusted headers)
4. M4 annotations + saved views
5. M5 per-message actions + webhook/script hooks
6. M6 truncation surfacing + UI

### Phase 2 — Error inbox + notifications

- Error inbox: fingerprint grouping, triage workflow, frequency chart (Sentry model)
- Notifications: in-app badge first, then Apprise-style URLs (ntfy://, slack://, discord://, tgram://, gotify://)
- Synthetic scan: local-first (Ollama), settings-gated, off by default; rules pre-filter, LLM on survivors
- Recipe: cluster → enrich → alert

### Phase 3 — Gateway-only dimensions

- IP/agent/project capture (additive migration now, columns later)
- Trusted `X-9R-App/User/Session` headers (consumes governance M1 trust model)

### Phase 4 — Ship-out (deferred)

- Langfuse export (MIT, best target) or OpenObserve (general log platform)
- Keep export platform-agnostic (raw request/response + own schema) — TensorZero-archived lesson
- Freeze a minimal OTel subset; re-verify semconv at P4 start

## What's deferred (explicitly out of scope for now)

- Visual query builder UI (JSON-path text input + saved views first)
- Cloud sync of annotations/saved views (local SQLite first)
- Multi-instance/Redis-backed anything
- Roles/RBAC (ship under existing dashboard auth)
- Reddit demand verification (manual, human pass)

## How to use the research during implementation

1. **Before each milestone**, read the relevant research section:
   - M1 facets → `message-viewer-design-philosophies.md` §B (filter dimensions) + gaps R1/R2 (perf/storage)
   - M2 JSON-path → design-philosophies §A.2 (Datadog query language) + gaps R3 (injection)
   - M3 identity → design-philosophies §C (gateway-only dimensions) + gaps D5
   - M4 annotations → design-philosophies §A.2 (saved views) + gaps R2 (retention)
   - M5 actions → v2 §5 (notifications) + gaps D3
   - M6 UI → v3 (3-panel, FTS5) + gaps R9 (UI complexity)
2. **Copy UX, never code** from GPL/AGPL projects (license guardrails in synthesis).
3. **Sanitize before any AI analysis** (gaps R3) — privacy is the highest-stakes risk.
4. **Verify against the actual codebase** — the code-bearing plan's reference code is a starting point for review, not a final implementation. If you find a better way, make that change happen.
5. **Update this plan** — mark milestones done, note deviations, link commits.

## Source docs

- `../research/message-capture-log-viewing.md`
- `../research/message-capture-deep-research-v2.md`
- `../research/message-capture-obscure-projects-v3.md`
- `../research/message-capture-v4-deep-pass.md`
- `../research/message-capture-gaps-and-risks.md`
- `../research/message-viewer-design-philosophies.md`
- `../planning/messages-page-feature-spec.md`
- `../planning/2026-09-15-message-driven-tools-implementation-plan.md`