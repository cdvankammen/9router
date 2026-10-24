---
Date: 2026-09-17
Author: GitHub Copilot
Status: active
Tags: research, chat-logs, session-index, transcripts, knowledge-capture
---

# 50 — Chat-Log Session Index

> Companion to `49-chat-log-mining-report.md`. A browsable index of every VS Code Copilot chat session mined from the transcripts directory and session DB, with what each session was about and where its knowledge landed.

## 1. Session DB Overview (from `session_store_sql`)

| Session ID | Agent | Created | Turns | Topic |
|---|---|---|---|---|
| `3c6b6a91` | GitHub Copilot Chat | 2026-09-16 | 9 | Hermes message import + skill creation |
| `ec81987e` | GitHub Copilot Chat | 2026-09-16 | 2 | (image gen) |
| `ed576b11` | GitHub Copilot Chat | 2026-09-16 | 3 | (image gen) |
| `a829ae9a` | GitHub Copilot Chat | 2026-09-15 | 1 | "are you working?" |
| `4efa60a4` | copilotLanguageModelWrapper | 2026-09-15 | 42 | Chat-log recovery + knowledge output |
| `1df05128` | GitHub Copilot Chat | 2026-09-15 | 12 | Chat-log listing + full transcript output |
| `38eabcb8` | GitHub Copilot Chat | 2026-09-15 | 1 | "continue" |
| `2576d9f0` | copilotLanguageModelWrapper | 2026-09-15 | 15 | Keyless governance / agent profiles / tag-priority queues / gate levels |
| `99d08742` | GitHub Copilot Chat | 2026-09-14 | 1 | Message-per-conversation research + tool-building ideas |
| `5de9578b` | GitHub Copilot Chat | 2026-09-14 | 20 | Webhook receive + action research |
| `9c7ce4ab` | GitHub Copilot Chat | 2026-09-14 | 37 | AI model routing deep research → corpus → binary-tree → impl plans → chat-log mining |
| `552ecf4c` | copilotLanguageModelWrapper | 2026-09-14 | 23 | Recent commits review + full transcript recovery |
| `4e28d77f` | GitHub Copilot Chat | 2026-09-09 | 6 | Detailed commits + build |
| `d8dad7fe` | GitHub Copilot Chat | 2026-09-03 | 9 | (memberry/pmox/ollama) |
| `b42a5176` | copilotLanguageModelWrapper | 2026-08-31 | 206 | (large session, context dump) |
| `76212e73` | GitHub Copilot Chat | 2026-08-30 | 4 | "you decide" |
| `0cf94fbf` | GitHub Copilot Chat | 2026-08-30 | 2 | "this is research only first" |
| `8c4ea189` | GitHub Copilot Chat | 2026-08-28 | 5 | "yes" |
| `82945122` | copilotLanguageModelWrapper | 2026-08-26 | 1 | (network hosts) |
| `48d62ea6` | GitHub Copilot Chat | 2026-08-19 | 87 | "Do you see all the chats from copilot yesterday" — orphaned-chat audit |
| `64c37010` | GitHub Copilot Chat | 2026-08-19 | 5 | (Try Again) |
| `8727887c` | GitHub Copilot Chat | 2026-08-08 | 73 | Prompts-and-plans folder review |
| `12d3621a` | GitHub Copilot Chat | 2026-08-08 | 125 | Chat logs for this folder |
| `72b9e67d` | GitHub Copilot Chat | 2026-08-08 | 93 | (exo repo, fix-memory-error) |
| `5ca189e6` | GitHub Copilot Chat | 2026-08-08 | 288 | (research-only subagent) |
| `1dc34408` | GitHub Copilot Chat | 2026-08-07 | — | RESEARCH ONLY two-part task |
| `fab429ae` | GitHub Copilot Chat | 2026-08-07 | — | READ-ONLY research task on 9Router |
| `284ece75` | GitHub Copilot Chat | 2026-08-07 | — | (aiMemoryEverything) |
| `161ad0b3` | GitHub Copilot Chat | 2026-08-07 | — | (aiMemoryEverything) |
| `84171d23` | GitHub Copilot Chat | 2026-08-07 | — | (aiMemoryEverything) |

## 2. The 9Router Research Arc (chronological)

### Phase 0 — Foundations (Aug 7–19)
- `fab429ae`, `1dc34408`, `5ca189e6` — READ-ONLY research tasks on the 9Router repo (Aug 7–8).
- `48d62ea6` (Aug 19) — orphaned-chat audit: the 9router workspace has **two different hash folders**; chats were copied into the current one.
- `e7eed49a`, `d4294fc8`, `4de22f61`, `72e3ad96`, `8727887c`, `14669f29`, `2cbf4374`, `3fe0d31f`, `1f65f3a1`, `77e25a71` — older sessions exported to `temp/chat-logs/` (Aug 19).

### Phase 1 — Deep research on AI model routing (Sep 14, `9c7ce4ab`)
- USER 1: "look at all ways that a ai model router works" — the origin of everything.
- USER 2: thorough 9Router codebase exploration (8-point investigation).
- Result: `37-ai-model-routing-deep-research.md` + `16-decision-points` + `smart-router-source`.

### Phase 2 — 1000-doc corpus (Sep 14–15, `9c7ce4ab`)
- USER 3/4: "do an adidtional 1000 documents ... place al the reasrch information and evreything in a csv".
- Pipeline: `scripts/collect-routing-corpus.mjs` (OpenAlex primary, GitHub via `gh`, arXiv, Crossref) → `llm-routing-corpus-1000.csv` (**3804 real docs**).
- USER 16: research-only clarification — "not implmenting anything in 9router yet".

### Phase 3 — Keyless governance (Sep 15, `2576d9f0`)
- USER 1: agent profiles, synthetic tracking, tag-priority queues, gate levels, model-group limiting, adaptive rate control.
- Result: `2026-09-14-keyless-governance-research.md` + exp-e01…e26 + branch-a/b docs + ADR-009.

### Phase 4 — Webhooks (Sep 14, `5de9578b`)
- USER 1: webhook receive + action research, binary-tree depth 5.
- Result: 31 webhook plan files (29 code-level + 2 outline) + `2026-09-15-webhook-master-research-tree.md`.

### Phase 5 — Message-per-conversation (Sep 14, `99d08742`)
- USER 1: "look at messages per their conversation ... build tools with in 9 router itself".
- Result: `38-message-driven-tools-research.md` + `2026-09-15-message-capture-*` interpretation docs.

### Phase 6 — Hermes message import + skill creation (Sep 16, `3c6b6a91`)
- USER 1: import Hermes agent message requests, match to providers by model name, create a combined research skill.
- Result: `skills/9router-research/SKILL.md` + `skills/9router-message-import/SKILL.md` + `2026-09-16-hermes-message-import-research.md`.

### Phase 7 — Binary-tree expansion (Sep 15–17, `9c7ce4ab`)
- USER 33: "expand interpret and build out more resarch ... upt o 6 bracnhes of a binary tree style ... there can be more than one implmentation plan there is no limit".
- Result: `scripts/expand-routing-tree.mjs` → **193 roots, 24511 nodes, 242852 searches** → `llm-routing-tree-6levels.csv` (24511 rows) → 8 branch docs (41–48) → **204 implementation plans**.

### Phase 8 — Meta-capture (Sep 17, `9c7ce4ab` — this pass)
- USER 42: "look at the actually chat log files and dbs etc and make sure that you interpret record and and save everything nicely in the promtps and plans folder".
- Result: this index + `49-chat-log-mining-report.md` + `scripts/mine-transcripts.mjs`.

## 3. Where the Knowledge Landed

| Knowledge | Location |
|---|---|
| AI model routing deep research | `research/9router/37-ai-model-routing-deep-research.md` |
| 1000-doc corpus | `research/9router/llm-routing-corpus-1000.csv` (3804 docs) |
| Binary-tree expansion | `research/9router/llm-routing-tree-6levels.csv` (24511 rows) + branch docs 41–48 |
| Implementation plans | `research/9router/impl-plan-001-*.md` … `impl-plan-204-*.md` |
| Keyless governance | `research/2026-09-14-keyless-governance-research.md` + exp-e01…e26 + branch-a/b docs |
| Webhooks | `planning/2026-09-15-webhook-*.md` (31 files) |
| Message-driven tools | `research/38-message-driven-tools-research.md` + `interpretation/2026-09-15-message-capture-*` |
| Hermes message import | `research/2026-09-16-hermes-message-import-research.md` + skills |
| Session narrative | `tracking/SESSION-NARRATIVE.md` (15 parts) |
| Learnings | `tracking/learnings/` (13 files) |
| Decisions | `tracking/decisions/` (ADR-001…011) |

## 4. Mining Tooling

- `scripts/mine-transcripts.mjs` — extracts user prompts + assistant summaries from `.jsonl` transcripts.
- `session_store_sql` — read-only SQLite queries over `sessions`/`turns`/`session_files`/`session_refs`/`checkpoints`/`search_index`.
- Raw transcripts: `~/Library/Application Support/Code - Insiders/User/workspaceStorage/9d36bc98974e3588f27c01391c3ae20e/GitHub.copilot-chat/transcripts/*.jsonl`.

## 5. Honesty Note

- Turn counts come from the session DB; user-message counts come from the transcript parser. They differ because the DB stores turns (request/response pairs) while transcripts store every message event.
- Sessions with 0 parsed user messages (`e7eed49a`, `fab429ae`) are older-format transcripts whose content didn't parse as `user.message` — their raw files remain the source of truth.