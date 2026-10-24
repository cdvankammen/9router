---
Date: 2026-09-17
Author: GitHub Copilot
Status: active
Tags: tracking, decisions, ADR, chat-logs, mining, research-method
---

# ADR-012: Chat-Log Mining as a First-Class Knowledge Source

## Context

The user's research workflow spans many VS Code Copilot sessions. The knowledge produced lives in `docs/plans-and-prompts/`, but the *process* — the research method, the decisions, the tooling gotchas — lives in the chat transcripts (`.jsonl`) and session DB. The user explicitly asked (session `9c7ce4ab`, USER 42): *"look at the actually chat log files and dbs etc and make sure that you interpret record and and save everything nicely in the promtps and plans folder."*

## Decision

Treat the chat logs and session DB as a **first-class knowledge source**:

1. **Mine them systematically** with a reusable script (`scripts/mine-transcripts.mjs`) that extracts verbatim user prompts + assistant summaries.
2. **Record the research method itself** — the 4 variants (strict binary tree, exponential phrase expansion, corpus flat expansion, multi-subagent) — as a documented artifact, not just an implicit practice.
3. **Cross-reference both sources**: transcripts (verbatim) + session DB (counts/summaries) — they diverge and complement each other.
4. **Preserve verbatim text** including typos — the user's phrasing is intentional and informative.
5. **Never fabricate** — unparseable transcripts are flagged honestly, raw files remain the source of truth.

## Alternatives Considered

- **Rely on `docs/plans-and-prompts/` artifacts only** — rejected: loses the process knowledge (method, decisions, gotchas) that the user explicitly wants captured.
- **Full transcript dump into the folder** — rejected: too large (5.2 MB for one session), unreadable; mined summaries + verbatim prompts are the right granularity.
- **Session DB only** — rejected: the DB has summaries but not verbatim prompts; the transcripts are the richer source.

## Consequences

**Positive:**
- The research method is now documented and reusable (`49-chat-log-mining-report.md` §4.2).
- Future sessions can mine past sessions without re-reading raw JSONL.
- The user's intent ("save everything nicely") is honored with browsable, indexed docs.

**Negative / Risks:**
- Mined docs are a snapshot; new sessions need re-mining (the script makes this cheap).
- Verbatim prompts contain typos — intentional fidelity, but may look like errors to readers.
- The session DB and transcripts can diverge; both must be checked.

**Reversibility:** Reversible — the raw transcripts remain the source of truth; mined docs can be regenerated.

## Who / When

- **Decision by:** GitHub Copilot (main session), 2026-09-17.
- **Status:** active.