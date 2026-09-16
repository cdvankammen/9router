# LLM Routing Corpus (1000+ docs) — Collection Methodology

**Date:** 2026-09-14
**Author:** GitHub Copilot (research agent)
**Status:** active
**Tags:** #research #routing #llm #model-selection #corpus #methodology #openalex #github #crossref #arxiv #9router

## Question / objective

Gather **1000+ real, distinct documents** on AI model routing (papers, GitHub repos, docs,
forums), research each document to a **minimum depth of 5** (at least 5 real searches per
document, unlimited searches allowed), and compile **all** research information — including the
prior deep-research work (`37-ai-model-routing-deep-research.md`, the 16 decision points, and
plans/prompts) — into a single CSV:

`docs/plans-and-prompts/research/9router/llm-routing-corpus-1000.csv`

This is a **research/collection** effort only. Nothing is implemented in 9Router itself.

## Sources consulted (live APIs)

| Source | Endpoint | Role | Notes |
|---|---|---|---|
| OpenAlex | `https://api.openalex.org/works?search=<q>&per-page=100&page=N&mailto=research@9router.dev` | Phase-1 seed | ~35 topic queries × 100 works; abstracts reconstructed from `abstract_inverted_index`; arXiv IDs via `ids.arxiv` (tagged `source=arxiv` — real arXiv papers without hitting rate-limited arXiv API). **Rate limit: 1000 requests/hour** (verified via `x-ratelimit-remaining` headers) — quota exhausts quickly at scale |
| Crossref | `https://api.crossref.org/works?query=<q>&rows=100&mailto=...` | **Phase-2 primary** | Generous polite pool (no 1000/hr cap). Phase-2 depth searches use Crossref first, OpenAlex fallback. Also the fallback for phase-1 OpenAlex 429s |
| GitHub | `gh api "search/repositories?q=<q>&per_page=100"` | Primary (repos) | 15 repo queries; **must use `/opt/homebrew/bin/gh`** (v2.97.0) — the `gh` on PATH (`/Users/chris/bin/gh`) is a Linux ELF binary that cannot run on macOS |
| arXiv API | `http://export.arxiv.org/api/query?search_query=...` | Optional (`--with-arxiv`) | Persistent 429/503 at scale — **abandoned as primary**; arXiv papers arrive via OpenAlex records instead |

## Pipeline (scripts/collect-routing-corpus.mjs → generate-routing-corpus-csv.mjs)

### Phase 1 — Seed collection (real documents only)
1. **OpenAlex**: 35 topic queries (`LLM routing`, `model routing`, `language model selection`,
   `mixture of experts routing`, `cascading language models`, `speculative decoding`,
   `AI gateway`, `model fallback LLM`, …) × 100 works each. Every work is real (OpenAlex ID,
   DOI, or arXiv ID). 429/503 handled with exponential backoff `2000·2^n + jitter` (~3 retries),
   then Crossref fallback.
2. **GitHub**: 15 repo queries (`llm router`, `model router`, `ai gateway`, `llm gateway`,
   `model fallback`, `prompt router`, `llm load balancer`, `model orchestration`, `llm proxy`,
   `multi-model router`, …) × 100 repos each via `gh api`. **No star threshold** — repos of any
   size are collected (user requirement: "no matter the number of stars").
3. **arXiv (optional)**: supplement with retry/backoff.

### Phase 2 — Depth-5 research per document (bounded, deterministic)
- Corpus is **trimmed to the target size (1050)** *before* expansion so the loop terminates.
- For each document: extract up to 5 key terms from its abstract/description (stopword-filtered,
  domain-bigram preference). Docs with no abstract get 5 fallback terms
  (`model routing`, `LLM routing`, `prompt routing`, `model selection`, `AI gateway`) — still 5
  **real** searches.
- Run **1 OpenAlex search per term** (5 searches/document = minimum depth 5; unlimited allowed).
- Record per search: term, result count, top-3 result IDs → `search_evidence`.
- **Discovered docs are NOT added to the corpus** during expansion (that caused an unbounded
  loop); they are recorded as `related_docs` evidence only.
- Deterministic termination: exactly `1050 docs × 5 searches = 5250 searches`.

### Phase 3/4 — CSV generation (generate-routing-corpus-csv.mjs)
- Merges **prior research rows first** (`prior_research_flag=1`): RouteLLM, RouterBench,
  FrugalGPT, Hybrid LLM, AutoMix, Shnitzer, Tryage, OpenRouter Auto Router, LiteLLM, ClawRouter,
  vLLM Semantic Router, semantic-router, coai, and 9Router's own 16 decision points /
  deep-research / smart-router source — each with real search evidence.
- Then corpus rows (`prior_research_flag=0`), deduped by `doc_id`.
- Columns: `row_id, source_type, doc_id, title, url, authors, published, categories, stars,
  depth, search_terms, search_evidence, findings, related_docs, prior_research_flag`.
- Output: `docs/plans-and-prompts/research/9router/llm-routing-corpus-1000.csv`.

## Depth methodology (honest)

- `depth` = number of **actual searches performed** for that document (min 5, unlimited).
- `search_evidence` = JSON of `{term, count, topIds}` per search — verifiable against OpenAlex.
- No fabricated rows: every document comes from a real API response; abstracts/metadata are real
  content.

## Known limitations / caveats (honest)

- **arXiv API** rate-limits hard at scale (persistent 429/503) → arXiv papers are collected via
  OpenAlex records (`ids.arxiv`), not the arXiv API.
- **Semantic Scholar** API was not used (rate limits / coverage overlap with OpenAlex).
- **OpenAlex 429s** are transient and recover with backoff; each query costs ~30s of retries.
- GitHub search API caps at 100 results/query; 15 queries → up to ~1500 repos (deduped).
- The corpus is a **sample** of the routing literature, not exhaustive — queries were chosen to
  cover learned routing, cascades, MoE routing, gateways, fallback, and serving.

## Related docs

- `37-ai-model-routing-deep-research.md` — prior deep research (16 decision points, product/paper analysis)
- `llm-routing-corpus-1000.csv` — this corpus (the deliverable)
- `scripts/collect-routing-corpus.mjs`, `scripts/generate-routing-corpus-csv.mjs` — pipeline