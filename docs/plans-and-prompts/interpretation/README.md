# Interpretation

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #synthesis #reading-guide #index

## Why this category exists

The `research/` folder holds deep, dense, and deliberately exhaustive research (binary trees, exponential N-ary expansions, thousands of nodes). That material is the *raw ore* — valuable but hard to navigate. This category is the **interpretation layer**: a set of documents that explain, in clear readable language, what the research says, what the intent behind it was, and in what order to read and act on it.

It is **not** new research and **not** a plan — it is the *map* over the research, planning, and tracking docs. Every interpretation doc links back to the source docs it interprets.

## Contents

| Doc | What it does |
|-----|--------------|
| `2026-09-15-webhook-interpretation-guide.md` | **Start here (webhooks).** The one-page-to-understand-everything: intent, the 4 phases of work, the complete doc map (23 docs), the one-paragraph summary, reading order, key conclusions, next steps |
| `2026-09-15-webhook-doc-by-doc.md` | Plain-language summary of **every** webhook doc: what it is, what it covers, key takeaways, how it fits, what to read next |
| `2026-09-15-webhook-synthesis.md` | The distilled knowledge: verdict, 12 archetypes, recommended architecture, 10 design decisions, 48 roots → 11 branches, open questions |
| `2026-09-15-webhook-order-and-next-steps.md` | The order of everything: chronological timeline, logical reading order, build order (M1–M5), what's deferred, how to use the research during implementation |
| `2026-09-15-governance-interpretation-guide.md` | **Start here (governance).** Keyless governance research interpreted: intent, doc map, one-paragraph summary, reading order, key conclusions, next steps |
| `2026-09-15-governance-doc-by-doc.md` | Plain-language summary of **every** governance doc: what it is, what it covers, key takeaways, how it fits, what to read next |
| `2026-09-15-governance-synthesis.md` | The distilled knowledge: verdict, governance model, design decisions, open questions |
| `2026-09-15-governance-order-and-next-steps.md` | The order of everything: chronological timeline, logical reading order, build order, what's deferred |
| `2026-09-15-message-capture-interpretation-guide.md` | **Start here (message capture).** Message capture/filtering research interpreted: intent, doc map, one-paragraph summary, reading order, key conclusions, next steps |
| `2026-09-15-message-capture-doc-by-doc.md` | Plain-language summary of **every** message-capture doc: what it is, what it covers, key takeaways, how it fits, what to read next |
| `2026-09-15-message-capture-synthesis.md` | The distilled knowledge: verdict, capture model, design decisions, open questions |
| `2026-09-15-message-capture-order-and-next-steps.md` | The order of everything: chronological timeline, logical reading order, build order, what's deferred |

## How this relates to the other categories

| Category | Role | This category's role |
|----------|------|----------------------|
| `research/` | Raw findings (the what) | Explains the findings (the what-it-means) |
| `planning/` | Plans & milestones (the how) | Explains the plans and their rationale (the why) |
| `tracking/` | History & status (the record) | Explains the history and current state (the where-we-are) |

## Conventions

- One interpretation doc per research topic (currently: webhook receive & act, keyless governance, message capture/filtering)
- Every claim links to its source doc with a relative path
- Written for a reader who has NOT read the source docs
- Status mirrors the underlying research: `active` while research is current, `archived` if the research is superseded