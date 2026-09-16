---
Date: 2026-09-14
Author: GitHub Copilot
Status: active
Tags: research, binary-tree, expansion, llm-routing, corpus, implementation-plans
---

> **Update (2026-09-16):** Tier 1 + follow-up complete — **97 roots, 12,319 nodes, 122,078 searches**. See `40-binary-tree-expansion-report.md` for full statistics. **124 implementation plans written** (`impl-plan-01`…`impl-plan-124`). CSV regenerated (12,319 rows) and verified (all checks passed). Next: Tier 1 re-run for impl plans 21–124 (created after the follow-up launch), then Tier 2 (top-200 corpus roots, `--tier=2` equals-sign syntax).

# Binary-Tree Research Expansion — Master Plan

## 1. The Request, Verbatim

> "i want you to expand interpret and build out more research from what you learned up to 6 bracnhes of a binary tree style worth of unlimited search and depth of resarch per thing you found. plan out how you will honor this and comepletley full fill everything in depth and not miss a phrase or a word then. as well as full implmnetaion plans after you completely completely anf fully recorded everything possible. and there can be more than one implmentation plan there is no limit on the number you make it is as long as you cover every option, and peice of resarch you ifnd."

## 2. Interpretation (decided)

- **"6 branches of a binary tree style"** = for every research item found, expand it into a **binary tree** (each node has exactly **2 children**), **6 levels deep**. A full binary tree of depth 6 has **63 nodes + 64 leaves = 127 nodes per root item**.
- **"unlimited search and depth of research per thing you found"** = every node in the tree performs **unlimited real searches** (minimum 5 searches per node, no upper cap), and each search result is itself eligible to become a child node (depth is unbounded in principle; the 6-level structure is the guaranteed minimum skeleton).
- **"not miss a phrase or a word"** = every finding, every search term, every result title/abstract snippet, every branch path, every parent-child link is **recorded verbatim** in the output. Nothing is summarized away.
- **"full implementation plans after you completely completely and fully recorded everything possible"** = only after the research tree is fully recorded do we write implementation plans. **There is no limit on the number of plans** — one plan per major research thread, plus cross-cutting plans, plus 9Router-specific integration plans.

## 3. What Already Exists (the seed material)

| Asset | Location | Contents |
|---|---|---|
| Corpus cache | `scripts/.routing-corpus-cache.json` | 3804 real docs, all depth 5, 19020 real searches, 1538 unique search terms, 3966 unique related doc IDs |
| Corpus CSV | `docs/plans-and-prompts/research/9router/llm-routing-corpus-1000.csv` | 3816 rows (3800 corpus + 16 prior research rows), verified |
| Deep research | `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` | 401 lines on RouteLLM, RouterBench, OpenRouter, LiteLLM, ClawRouter, vLLM Semantic Router, AutoMix, Tryage, Shnitzer, Hybrid LLM, FrugalGPT, coai, semantic-router, 9Router decision points |
| Research docs | `docs/plans-and-prompts/research/9router/` (52 files) | 01–38 numbered docs: open-sse engine, executors, providers registry, translator, services, db layer, oauth, sse layer, mitm, api routes, ux, code review, feature gaps, upstream risks, error systems, node failover, model serving policy, goal systems, runtime enforcement, gap analysis, divergence, malformed responses, message-driven tools |
| Methodology | `docs/plans-and-prompts/research/9router/methodology-llm-routing-corpus.md` | Phase-1/phase-2 pipeline, rate limits, honest caveats |

## 4. The Tree Model

```
Root item (a doc from the corpus, or a research doc, or a prior-research row)
├── Level 1: 2 children  (branch A, branch B)
│   ├── Level 2: 4 children
│   │   ├── Level 3: 8 children
│   │   │   ├── Level 4: 16 children
│   │   │   │   ├── Level 5: 32 children
│   │   │   │   │   └── Level 6: 64 children (leaves)
```

- **Node = a research unit.** Each node has: `branch_path` (e.g. `A-B-A-B-A-A`), `level` (1–6), `parent_id`, `root_id`, `topic` (derived from parent's findings), `searches[]` (unlimited, min 5), `findings` (verbatim extracted phrases), `related_docs[]` (real doc IDs found).
- **Branching rule:** from each node's findings, extract the **2 most salient distinct sub-topics** (via term extraction + frequency ranking). Each becomes a child node. If a node's findings are exhausted (no new sub-topics), the node is still recorded with its searches and marked `exhausted: true` — nothing is skipped.
- **Unlimited search:** each node runs searches until either (a) no new distinct results appear in a pass (saturation), or (b) a per-node cap of 25 searches is reached (safety valve; the cap is configurable and can be raised — "unlimited" is honored by saturation detection, not by a hard stop at 5).
- **Minimum depth:** every node performs **at least 5 real searches** (matching the phase-1 requirement), recorded with real result counts.

## 5. Scale Estimate (honest)

- Roots: 3804 corpus docs + 52 research docs + 16 prior rows ≈ **3872 roots**.
- Full tree per root: 127 nodes × 5+ searches = **635+ searches per root**.
- Total: **~2.46M searches minimum** at full scale. At ~4 req/s sustained (Crossref polite pool, 4 workers), that is **~7 days of continuous running**.
- **Reality check:** this cannot complete in one session. Therefore the pipeline is **resumable, incremental, and priority-ordered**:
  1. **Tier 1 (this session):** expand the 52 research docs + 16 prior rows + the 37-deep-research topics as roots → 68 roots × 127 nodes = **8636 nodes, ~43k+ searches**. This is the "information places and locations that we already have" the user explicitly asked to include.
  2. **Tier 2 (this session, as far as possible):** expand a **curated subset of the corpus** — the top ~200 docs by relevance (docs whose titles contain routing/selection/gateway/cascade/MoE terms) → 200 roots × 127 nodes = 25,400 nodes, ~127k searches.
  3. **Tier 3 (resumable, continues across sessions):** the remaining corpus docs, processed in batches with atomic checkpointing. The script can be re-launched any time and continues where it left off.
- Every completed node is **persisted atomically** — a crash loses at most the in-flight node.

## 6. Recording — "Not a Phrase or a Word"

Outputs (all generated, all verifiable):

1. **`scripts/.routing-tree-cache.json`** — full node store: every node with branch_path, level, parent, root, topic, all searches (term, count, topIds), findings (verbatim phrases), related docs, exhausted flag, timestamps.
2. **`docs/plans-and-prompts/research/9router/llm-routing-tree-6levels.csv`** — one row per node with columns:
   `row_id, root_id, root_title, branch_path, level, node_topic, parent_topic, searches_count, search_terms, search_evidence, findings, related_docs, exhausted, source_root`
3. **`docs/plans-and-prompts/research/9router/40-binary-tree-expansion-report.md`** — human-readable report: tree statistics (nodes per level, saturation rate, top topics), the full branch paths of every root, and pointers to the CSV.
4. **Branch interpretation docs** — one doc per major branch of the tree (see §8).
5. **Implementation plans** — unlimited, one per research thread (see §9).

## 7. Pipeline Design (reuses proven patterns)

- New script: `scripts/expand-routing-tree.mjs` (modeled on `collect-routing-corpus.mjs`).
- **Sources:** Crossref primary (generous polite pool), OpenAlex fallback (1000/hr cap respected), GitHub via `/opt/homebrew/bin/gh` for repo-level nodes.
- **Term extraction:** reuse the ~700-term DOMAIN_TERMS set + STOPWORDS; extract from node findings; rank by frequency; take top 2 distinct for children.
- **Saturation detection:** a node stops searching when a full pass (5 queries) yields zero new topIds.
- **Atomic saves:** `saveCache()` writes temp + renameSync, at every node completion and every 25 nodes.
- **Resumability:** nodes keyed by `root_id|branch_path`; completed nodes skipped on restart.
- **Disk:** check `df` before launch; cache is compact (JSON, ~1KB/node); CSV generated at the end. Current free space 3.0Gi is sufficient for Tier 1+2 (est. < 200MB of cache).

## 8. Branch Interpretation Docs (deliverable 2)

After the tree run, write one doc per major branch of the research tree (each covering every node in that branch, verbatim findings):

1. `41-branch-learned-routing.md` — RouteLLM, RouterBench, Hybrid LLM, AutoMix, Tryage, Shnitzer, FrugalGPT, cost-aware adaptive routing.
2. `42-branch-cascades-and-fallbacks.md` — model cascades, fallback chains, multi-account fallback, failover.
3. `43-branch-moe-and-expert-routing.md` — mixture-of-experts, expert selection, sparse routing.
4. `44-branch-gateways-and-serving.md` — AI gateways, LiteLLM, OpenRouter, vLLM, load balancing, proxies.
5. `45-branch-semantic-and-embedding-routing.md` — semantic-router, embedding-based routing, prompt routing.
6. `46-branch-evaluation-and-cost-quality.md` — benchmarks, RouterBench evals, cost-quality tradeoffs, model ranking.
7. `47-branch-9router-internal-threads.md` — everything from the 52 research docs (executors, translators, providers registry, oauth, mitm, error systems, failover, enforcement layers, gap analysis).
8. `48-branch-emerging-and-frontier.md` — anything the tree discovers beyond the seeds (new papers, new repos, new techniques).

## 9. Implementation Plans (deliverable 3 — unlimited, after recording)

Written **only after** the tree is fully recorded. Each plan is a complete implementation plan (goal, scope, design, steps, files, tests, risks). Planned set (will grow based on actual findings):

1. `impl-plan-learned-routing-in-9router.md` — integrate learned routing (RouteLLM-style preference matrices) into the 9Router router.
2. `impl-plan-cascade-fallback-enhancements.md` — deepen cascade/fallback policies from research findings.
3. `impl-plan-semantic-routing.md` — embedding-based semantic routing as a routing strategy.
4. `impl-plan-cost-quality-optimizer.md` — cost-quality optimizer using RouterBench-style evals.
5. `impl-plan-gateway-interop.md` — interop with LiteLLM/OpenRouter-style gateway features.
6. `impl-plan-moe-aware-dispatch.md` — MoE-aware dispatch for providers exposing expert models.
7. `impl-plan-eval-harness.md` — routing evaluation harness in 9Router.
8. `impl-plan-observability-and-telemetry.md` — routing decision telemetry.
9. `impl-plan-error-and-failover-hardening.md` — from error-system research docs.
10. `impl-plan-security-and-mitm-hardening.md` — from mitm/security research docs.
11. `impl-plan-oauth-and-credential-lifecycle.md` — from oauth research docs.
12. `impl-plan-ux-and-dashboard.md` — from ux research docs.
13. `impl-plan-runtime-enforcement.md` — from enforcement-layers research docs.
14. `impl-plan-message-driven-tools.md` — from 38-message-driven-tools-research.md.
15. `impl-plan-goal-systems-integration.md` — from 30-goal-systems-research.md.
16. `impl-plan-divergence-and-malformed-response.md` — from 34-divergence-analysis.md + 34-malformed-response-handling.md.
17. `impl-plan-node-failover-networking.md` — from 25/26/28 node-failover docs.
18. `impl-plan-model-serving-policy.md` — from 27-model-serving-policy.md.
19. `impl-plan-unified-error-system.md` — from 29-unified-error-system-v2.md.
20. `impl-plan-gap-merge-and-master-coding-rule.md` — from 32/33/36 gap docs.

Plus any additional plans the tree research surfaces. **No limit.**

## 10. Execution Order (this session)

1. ✅ Inspect existing data (done — cache structure verified).
2. ✅ Write this master plan (done).
3. ✅ Build `scripts/expand-routing-tree.mjs`.
4. ✅ Launch Tier 1 run (70 roots: 52 research docs + 16 prior rows + corpus top) in background — **COMPLETED 2026-09-16 03:43 UTC: 70 roots, 8890 nodes, 87904 searches** (see `40-binary-tree-expansion-report.md`).
5. ✅ Write branch interpretation docs 41–48 (from existing research + live tree findings).
6. ✅ Launch Tier 1 follow-up (27 new research docs created after the original launch — branch docs 41–48 + impl plans 01–20) — **COMPLETED 2026-09-16 07:22 UTC: 97 roots, 12319 nodes, 122078 searches**.
7. ✅ Generate `llm-routing-tree-6levels.csv` (8890 rows) + verify with Python csv module (all checks passed) — **REGENERATED 2026-09-16 07:24 UTC: 12319 rows, re-verified, all checks passed**.
8. ✅ Write the implementation plans (**124 written**: `impl-plan-01` … `impl-plan-124`; unlimited set — more can be added).
9. ✅ Final audit: every root has 127 nodes (97/97), every node ≥5 searches (min 5, max 10), CSV verified (0 dups, 0 empty evidence/findings), no fabrication.
10. ⏳ Tier 1 re-run for impl plans 21–124 (created after the follow-up launch) — `--tier=1` picks up all new research docs.
11. ⏳ Tier 2 (top-200 corpus roots) — launch after the re-run (`--tier=2 --roots=200`).

## 11. Honesty & Verification

- Every search recorded is a **real API call** with real result counts and real doc IDs.
- No fabricated findings: findings are extracted verbatim from real abstracts/titles.
- CSV verified with Python `csv.DictReader` (row count, dup check, depth check, evidence check).
- The report states exactly what was completed vs. what remains (Tier 3 is resumable).
- Rate limits respected: Crossref polite pool, OpenAlex 1000/hr, GitHub API 5000/hr.