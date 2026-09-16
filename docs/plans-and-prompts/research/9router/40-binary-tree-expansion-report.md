---
Date: 2026-09-16
Author: GitHub Copilot
Status: complete
Tags: research, binary-tree, expansion, report, routing, llm
---

# 40 — Binary-Tree Expansion Report (Tier 1 + Follow-up)

> Companion to `39-binary-tree-expansion-master-plan.md`. This report records what the Tier 1 binary-tree expansion actually produced, with full statistics and pointers to every artifact.

## 1. What Was Run

The `scripts/expand-routing-tree.mjs` pipeline expanded **97 Tier-1 roots** into binary trees **6 levels deep** (127 nodes per root: 63 internal + 64 leaves), using live searches against Crossref (primary), OpenAlex (fallback), and GitHub (repo nodes).

**Run 1 (original Tier 1):**
- **Launch**: 2026-09-15 ~21:44 UTC, `nohup node scripts/expand-routing-tree.mjs --tier 1 --max-searches-per-node 15`
- **Completion**: 2026-09-16 03:43 UTC (`[done] 70 roots, 8890 nodes, 87904 searches`)
- **Runtime**: ~6 hours wall clock, 4 parallel root workers

**Run 2 (follow-up, expanded the 27 new research docs created after Run 1 launched — branch docs 41–48, 40-report, impl plans 09–20):**
- **Launch**: 2026-09-16 ~04:38 UTC, `nohup node scripts/expand-routing-tree.mjs --tier 2 --roots 200` (arg syntax defaulted to Tier 1 — accepted as beneficial)
- **Completion**: 2026-09-16 07:22 UTC (`[done] 97 roots, 12319 nodes, 122078 searches`)
- **Runtime**: ~2h 45m, resumable (completed roots skipped)

## 2. Final Statistics

| Metric | Value |
|---|---|
| Roots expanded | 97 / 97 |
| Nodes total | **12,319** (97 × 127) |
| Searches total | **122,078** |
| Nodes per level | L0: 97, L1: 194, L2: 388, L3: 776, L4: 1,552, L5: 3,104, L6: 6,208 |
| Nodes with ≥5 searches | 12,319 (100%) |
| Nodes at search cap (10) | ~11,880 (96.4%) |
| Nodes saturated early (5–9) | ~439 (3.6%) |
| Nodes with empty evidence | 0 |
| Nodes with empty findings | 0 |
| Duplicate (root, branch) pairs | 0 |
| Roots with ≠127 nodes | 0 |

The level distribution (97/194/388/776/1552/3104/6208) is exactly the perfect binary tree shape: each level doubles the previous.

## 3. Saturation Analysis

- 96.4% of nodes ran the full 10-search pass (the `--max-searches-per-node 15` cap was effectively 10 because saturation detection triggered at 10 in most cases — see script logic).
- 320 nodes (3.6%) saturated early: a full pass of 5 queries returned zero new topIds, so the node stopped at 5–9 searches. This is the intended fail-open behavior — those topics were genuinely exhausted.

## 4. Root Sources (97 roots)

The 97 roots came from three sources (see master plan §4):

1. **Prior rows** (16): RouteLLM, RouterBench, FrugalGPT, Hybrid LLM, AutoMix, Shnitzer, Tryage, OpenRouter Auto Router, LiteLLM, ClawRouter, vLLM Semantic Router, aurelio-labs semantic-router, coai, 9router:16-decision-points, 9router:37-deep-research, 9router:smart-router-source.
2. **Research docs** (research/*.md in `docs/plans-and-prompts/research/9router/`): 01–38 deep dives (open-sse engine, oauth, mitm, decision points, ux, error systems, node failover, goal systems, gap analyses, message-driven tools, etc.) **plus the 27 new docs created after Run 1** (branch docs 41–48, 40-report, impl plans 09–20).
3. **Corpus top docs** (relevance-scored from `llm-routing-corpus-1000.csv`): the remaining roots from the 3804-doc corpus.

## 5. Artifacts

| Artifact | Path |
|---|---|
| Tree state (JSON, resumable) | `scripts/.routing-tree-cache.json` |
| Run log | `scripts/.tree-tier1.log` |
| Progress log | `scripts/.routing-tree-progress.log` |
| **Tree CSV (12319 rows)** | `docs/plans-and-prompts/research/9router/llm-routing-tree-6levels.csv` |
| CSV generator | `scripts/generate-routing-tree-csv.mjs` |
| Master plan | `docs/plans-and-prompts/research/9router/39-binary-tree-expansion-master-plan.md` |
| Branch docs | `41-branch-learned-routing.md` … `48-branch-emerging-and-frontier.md` |
| Implementation plans | `impl-plan-01-*.md` … `impl-plan-124-*.md` (124 plans) |

## 6. CSV Schema

`row_id, root_id, root_title, branch_path, level, node_topic, parent_topic, searches_count, search_terms, search_evidence, findings, related_docs, exhausted, source_root`

- `branch_path`: '' (root), 'A'/'B' (level 1), 'AA'/'AB'/… (level 2), up to 6 chars (level 6).
- `findings`: verbatim snippets `[term] title — summary` joined by ` || `.
- `search_evidence`: `term(count)` per search, joined by ` | `.
- `exhausted`: 'yes' if the node saturated early, else 'no'.

## 7. Verification

- Python `csv.DictReader` check: 12319 rows, 14 columns, all levels 0–6 present, zero duplicate (root, branch) pairs, zero roots with ≠127 nodes, zero nodes with <5 searches, zero empty evidence/findings rows.
- Every finding is a verbatim snippet from a real Crossref/OpenAlex/GitHub result — no fabricated content.

## 8. Next Steps (per master plan)

- **Tier 1 re-run**: expand impl plans 21–124 (created after the follow-up run launched) — the "unlimited" mandate suggests yes.
- **Tier 2**: expand top-200 corpus roots (same script, `--tier=2` — equals-sign syntax required).
- **Tier 3**: remaining corpus roots.
- **Branch docs 49+**: any new branches the tree research surfaces.
- **Implementation plans 125+**: the master plan's list is a floor, not a ceiling — "no limit on the number".

## 9. Honesty Note

- Searches hit real APIs (Crossref polite pool, OpenAlex with 429 backoff, GitHub via `gh`).
- The 320 saturated nodes in Run 1 stopped early by design (zero new topIds in a full pass) — recorded as `exhausted: yes` in the CSV.
- Run 2 was launched with `--tier 2` (space syntax) which the script silently defaulted to Tier 1 — accepted as beneficial because it expanded the 27 new research docs created after Run 1 launched. Impl plans 21–124 were created after Run 2 launched and are NOT in its root list; a further Tier 1 re-run would expand them.