# Governance & Attribution — Order and Next Steps

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #governance #order #next-steps

The order of everything: chronological timeline, logical reading order, build order, deferred items, and how to use the research during implementation.

---

## Chronological Timeline

| Date | Work | Docs |
|------|------|------|
| 2026-08-31 | Origin + destination research + plan | `../research/2026-08-31-message-origin-and-destination-research.md`, `../planning/2026-08-31-source-app-governance-plan.md` |
| 2026-09-14 | Keyless governance research + plan | `../research/2026-09-14-keyless-governance-research.md`, `../planning/2026-09-14-keyless-governance-plan.md` |
| 2026-09-15 | 2-way binary tree expansion | `../research/2026-09-15-master-research-tree.md` + 16 branch docs |
| 2026-09-15 | Per-topic binary trees | `../research/2026-09-15-master-topic-index.md` + 26 tree docs |
| 2026-09-15 | Exponential N-ary expansion | `../research/2026-09-15-exponential-master-map.md` + 26 expansion docs |
| 2026-09-15 | Interpretation layer | `2026-09-15-governance-*.md` (4 docs) |
| 2026-09-15 | Code-bearing implementation plan | `../planning/2026-09-15-governance-implementation-plan.md` |

---

## Logical Reading Order

1. `2026-09-15-governance-interpretation-guide.md` — the one-page summary
2. `2026-09-15-governance-doc-by-doc.md` — what each doc is
3. `2026-09-15-governance-synthesis.md` — the distilled knowledge
4. `2026-09-15-governance-order-and-next-steps.md` — this doc
5. `../research/2026-08-31-message-origin-and-destination-research.md` — the root research
6. `../research/2026-09-14-keyless-governance-research.md` — the keyless research
7. `../planning/2026-09-15-governance-implementation-plan.md` — the code-bearing plan

For deep dives, follow the doc-by-doc links into the tree/expansion docs.

---

## Build Order (Milestones)

The code-bearing implementation plan (`../planning/2026-09-15-governance-implementation-plan.md`) defines 7 milestones. Recommended order:

| Order | Milestone | Answers | Depends on |
|-------|-----------|---------|------------|
| 1 | M1 Agent Profiles (keyless identity) | "who is calling" | — |
| 2 | M2 Synthetic Source Tracking | "where from" (without cooperation) | M1 |
| 3 | M3 Tag/Keyword Priority Queues | "how to prioritize" | M1 |
| 4 | M4 Gate Levels | "what access level" | M1 |
| 5 | M5 Model-Group Limiting | "how to cap model families" | M1, M3 |
| 6 | M6 Adaptive Rate Control | "how fast to go" | M5 |
| 7 | M7 Unified Governance Dashboard | "see it all" | M1–M6 |

**Note:** The original `2026-08-31-source-app-governance-plan.md` (M1–M7) and `2026-09-14-keyless-governance-plan.md` (M1–M7) overlap with this plan. The code-bearing plan is the consolidated, implementation-ready version — use it as the primary reference; the older plans remain as design rationale.

---

## Deferred Items (documented, not started)

- Teams/workspaces with shared budgets (Phase 4)
- Cloud-sync of governance config
- MCP server for gateway management
- Per-model upstream rate-limit mirroring (we surface upstream 429s, we don't pre-empt them)
- mTLS/client certs (L5)
- Prompt-embedding clustering for synthetic sources (expensive; future)
- OAuth/device flow
- Visual workflow editor (n8n-style)

---

## How to Use the Research During Implementation

1. **Start with the code-bearing plan** (`../planning/2026-09-15-governance-implementation-plan.md`) — it has reference code per milestone.
2. **For each milestone**, read the corresponding:
   - Tree doc (`../research/2026-09-15-tree-t*.md`) for the 2-way deep dive
   - Expansion doc (`../research/2026-09-15-exp-e*.md`) for the N-ary deep dive
   - Branch docs (`../research/2026-09-15-branch-*.md`) for cross-cutting topics
3. **Verify against the actual codebase** — the plan's reference code is a starting point; the implementing agent must review it and improve it (see the plan's "Note to implementing agents").
4. **Update tracking** — `../tracking/TASKS.md`, `../tracking/CHANGELOG.md`, `../tracking/SESSION-HISTORY.md` as milestones complete.

---

## Next Steps

1. Review the code-bearing implementation plan
2. Decide milestone order (M1 attribution first — it's the foundation)
3. Implementation is deferred — awaiting user go-ahead