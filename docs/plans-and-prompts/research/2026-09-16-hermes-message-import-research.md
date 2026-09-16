# Research: Hermes Message Import — Recording External Agent Traffic in 9Router

**Date:** 2026-09-16
**Author:** GitHub Copilot agent (main session)
**Status:** active (research + skill design — no code changed)
**Tags:** research, message-import, hermes, observability, provider-matching, log-import

## 1. Objective

Enable 9Router to **import, record, and analyze AI agent message requests that did NOT go through 9Router** — specifically Hermes agents (and by extension Claude Code, Cursor, Codex, and other local agents). Imported traffic must be:

- Matched to known providers **by model name**
- Normalized to the same schema as native `requestDetails`
- Costed, error-categorized, and viewable in the Messages page **as if it went through 9Router**
- Reconstructable: codes, messages, errors, latency, tokens — everything

## 2. Why This Matters

Hermes agents currently call providers directly, bypassing 9Router. This creates a blind spot:

- No unified log of all AI traffic
- No cost tracking for direct calls
- No error analysis for direct-call failures
- No provider matching / model normalization
- No way to "replay" what happened as if it went through the router

The import feature closes this gap: **any** agent traffic can be recorded and analyzed with the full 9Router observability stack.

## 3. Research Method Used

This research follows the **6-Level Binary Tree Research Method** (see `skills/9router-research/SKILL.md`):

- **Reaped** all prior message-capture research (v1–v4), the binary-tree expansion reports, and the session-store chat logs from the last 24 hours
- **Sought** existing skills/tools (skill-creator, find-skills, message-capture docs)
- **Expanded** the import concept into a full feature design with provider matching, normalization, error reconstruction, and DB schema

## 4. Key Findings

### 4.1 Existing Infrastructure to Reuse

| Component | Reuse for import |
|-----------|-----------------|
| `requestDetailsRepo.js` | Buffer/batch write pattern, maxRecords cap, flush timer |
| `usageDb.js` | Unified querying (`getRequestDetails`, facets, conversation grouping) |
| `error-categorizer` | Classify imported errors identically to native |
| `providerModels.js` | Model → provider matching |
| `pricingRepo.js` | Cost calculation for imported requests |
| `sourceApps.js` | Source app detection from UA/headers |
| Messages page UI | Unified viewer with `source` filter |
| `open-sse/providers/registry/*` | Per-provider model lists for matching |

### 4.2 Provider Matching Strategy

Model-name matching is the core enabler. Pipeline:

1. **Normalize** — lowercase, strip version suffixes
2. **Exact match** — against provider registry model lists
3. **Prefix match** — `claude-` → anthropic, `gpt-` → openai, `gemini-` → google
4. **Fuzzy match** — `sonnet` → claude-3-sonnet family
5. **Unknown** — keep verbatim, mark `provider: unknown`, confidence 0

Confidence scoring: exact 1.0, prefix 0.9, fuzzy 0.7, none 0.0.

### 4.3 Import Sources

| Source | Method | Pros | Cons |
|--------|--------|------|------|
| Hermes hook | POST `/api/messages/import` | Real-time, complete | Requires Hermes config |
| Log file tail | Parse `usage.json`/`log.txt`/JSONL | No agent changes | Parsing complexity |
| Transparent proxy | Route agent through 9Router | Zero agent changes | Needs proxy config |
| Manual JSON | Paste pairs | Quick | Manual |

### 4.4 Error Reconstruction

Imported failures reconstruct: HTTP status → category (4xx/5xx/timeout), error body → known patterns, provider+model → provider-specific docs, timestamp → outage correlation, retry count → headers.

### 4.5 Schema

New `imported_messages` table (or `requestDetails` with `imported` flag) — see `skills/9router-message-import/SKILL.md` §7 for full DDL.

## 5. Deliverables

1. **`skills/9router-research/SKILL.md`** — the combined deep-research skill (reap + seek + 6-level binary tree + message import)
2. **`skills/9router-message-import/SKILL.md`** — the message import feature skill
3. **`skills/README.md`** — updated with both new skills
4. This research note

## 6. Open Questions

- Should imported records live in a separate table or in `requestDetails` with a flag? (Separate table is cleaner for provenance; flag is simpler for unified queries.)
- How to handle dedup when the same request is captured by both hook and proxy?
- Should import be gated behind an API key / auth?
- Max import batch size and rate limits?
- Should imported conversations be mergeable with native conversations?

## 7. Next Steps

1. Implement `imported_messages` table + migration
2. Implement `importedMessagesRepo.js`
3. Implement `/api/messages/import` POST endpoint
4. Implement matcher/normalizer/error-reconstructor
5. Wire into `usageDb.js` unified queries
6. Update Messages page with `source` filter
7. Add Hermes hook config
8. Tests

## 8. Sources

- `docs/plans-and-prompts/research/message-capture-deep-research-v2.md`
- `docs/plans-and-prompts/research/message-capture-v4-deep-pass.md`
- `docs/plans-and-prompts/research/message-capture-gaps-and-risks.md`
- `docs/plans-and-prompts/research/message-capture-obscure-projects-v3.md`
- `docs/plans-and-prompts/research/9router/39-binary-tree-expansion-master-plan.md`
- `docs/plans-and-prompts/research/9router/40-binary-tree-expansion-report.md`
- `docs/plans-and-prompts/research/2026-09-15-exponential-master-map.md`
- Session store: `9c7ce4ab`, `2576d9f0`, `5de9578b`, `4de22f61` (binary-tree method origin + message-capture research)
- `src/lib/db/repos/requestDetailsRepo.js`, `src/app/api/messages/route.js`