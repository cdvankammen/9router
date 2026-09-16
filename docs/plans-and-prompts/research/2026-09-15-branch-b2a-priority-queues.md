# Branch Research — B2a: Priority Queues (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #queue #priority #wfq #binary-tree #branch-b2a

## Objective

Deep-dive the **priority queues** subtree: strict priority (B2a1) and WFQ + aging (B2a2), down to L6 leaves.

```
B2a PRIORITY QUEUES
├─ B2a1: STRICT PRIORITY
│  ├─ B2a1L: highest-priority-first dequeue
│  │  ├─ B2a1LL: emergency/critical traffic
│  │  └─ B2a1LR: starvation risk
│  └─ B2a1R: tag/keyword → priority mapping
│     ├─ B2a1RL: keyword scan of last user message
│     └─ B2a1RR: highest-match wins
└─ B2a2: WFQ + AGING
   ├─ B2a2L: weighted fair queueing
   │  ├─ B2a2LL: proportional dequeue by weight
   │  └─ B2a2LR: per-profile fairness
   └─ B2a2R: priority aging
      ├─ B2a2RL: priority decays with wait time
      └─ B2a2RR: starvation prevention
```

## Codebase grounding

- No queue exists in 9router today. Requests flow directly from `chat.js` → `chatCore.js` → executor. The phase-2 plan proposed an opt-in bounded priority queue (M3); this branch designs the algorithms.
- The tag/keyword → priority mapping (B2a1R) builds on the phase-2 concept: tags as groupings of keywords; prompts containing matching keywords get higher queue priority.

## External research

### B2a1LL — Emergency/critical traffic

- Strict priority: dequeue the highest-priority queue first. If priority-5 requests exist, priority-0 never runs.
- Appropriate for "emergency" traffic (e.g. safety-critical requests that must go first). For 9router, "critical" = requests from profiles designated as high-priority (e.g. the user's interactive session vs. a batch agent).

### B2a1LR — Starvation risk

- Classic strict-priority problem: if high-priority traffic is constant, low-priority requests starve. The mitigation is **aging** (B2a2R): a low-priority request that has waited long enough has its priority boosted.
- In 9router: starvation is unlikely (local gateway, not internet-scale), but still a design flaw worth fixing proactively.

### B2a1RL — Keyword scan of last user message

- The tag → priority mapping: scan the last user message for keywords, take the highest-matching tag's priority.
- Implementation: simple regex/substring scan against a configured tag registry. Connects to `classifyTask` (smartRouter) — task type can *also* map to priority (e.g. `code:debugging` → high, `general_chat` → normal).
- Design: tags are configured by the admin (not user-supplied), so the scan is trusted. No injection risk.

### B2a1RR — Highest-match wins

- If a message matches multiple tags (e.g. "debug this qwen error" matches both `debugging` → high and `qwen` → low), the highest priority wins. Simple and intuitive.
- Alternative: weighted sum — more complex, rarely justified. Highest-match is the right choice.

### B2a2LL — Weighted fair queueing (WFQ)

- WFQ (Parekh & Gallager 1993): computes a **virtual finish time** for each packet/flow; schedules the packet with the smallest virtual finish time next. Each flow gets a configurable weight; its share of bandwidth is proportional to its weight.
- Key property: **proportional fairness** — a flow with weight 2 gets twice the throughput of weight 1. But a weight-0 flow still gets *some* service (unlike strict priority).
- Complexity: O(log n) per schedule step (priority queue / heap). For n < 1000 (9router's scale), this is negligible.
- Application: per-profile fairness. Each profile has a weight; the queue dispatches proportionally. A "user interactive" profile (weight=10) gets 10× the throughput of a "batch agent" profile (weight=1).
- From the Wikipedia research (fetched 2026-09-15): WFQ with all-equal weights degenerates to FQ (fair queueing, equal share). WF2Q+ adds a virtual start time to prevent a flow from getting ahead of its fair share even transiently.

### B2a2LR — Per-profile fairness

- Each profile (B6b2) has a weight; WFQ uses the weight to compute virtual finish times. The admin sets weights per-profile; the queue enforces proportional fairness without per-request decisions.
- This is the "predictive amounts in the queue / messages/s kind of math" — WFQ's weight → throughput ratio is exactly the proportional allocation.

### B2a2RL — Priority aging

- Aging: a request's effective priority increases linearly (or exponentially) with wait time. After enough waiting, a low-priority request reaches the top.
- Formula: `effectivePriority = basePriority + ageFactor × waitTime`. Typical: ageFactor = 1 priority level per 30 seconds.
- WFQ aging alternative: WFQ *inherently* prevents starvation because a flow that waits long enough has a smaller virtual finish time (it was scheduled earlier in virtual time). So strict priority + aging = one solution; WFQ = another, simpler solution.

### B2a2RR — Starvation prevention

- The design: **WFQ as the default scheduler** (handles fairness natively) with optional priority boosts (aging) for edge cases. No need for explicit starvation-prevention code if using WFQ — it's baked into the algorithm.
- For v1: WFQ with per-profile weights. Aging only needed if strict priority is ever used as an override.

## Synthesis — design space

1. **Queue architecture:**
   - Bounded queue (configurable depth, default 50; see B2b for bounds/backpressure).
   - WFQ scheduler with per-profile weights.
   - Optional priority boost from tag/keyword matches (additive, capped at +2 levels).
   - No strict priority for v1 (starvation risk); keep it as a documented option.
2. **Weight defaults:**
   - Interactive user profiles: weight 10.
   - Named agent profiles: weight 5.
   - Default/unknown: weight 3.
   - Batch/background: weight 1.
3. **Tags → priority:** scan last user message → highest tag match → boost weight by +2 (e.g. default 3 → 5). Compose with profile weight: `effectiveWeight = profileWeight + tagBoost`.
4. **Implementation:** JS `Array` with a heap/priority-queue insert (npm `heapify` or hand-rolled binary heap — ~30 lines). Zero-dep is possible but a small dep for correctness is acceptable.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| WFQ is the right algorithm (fairness without starvation) | High |
| O(log n) complexity is negligible at 9router scale | High |
| Tag-scan → highest-match is the right priority mapping | High |
| Priority aging is unnecessary if using WFQ | High |
| WFQ + per-profile weights matches "messages/s math" ask | High |

## Open questions

1. What happens to in-flight requests when the queue is full? (Answered by B2b backpressure — 503.)
2. Should tag boosts be configurable (admin UI) or hardcoded?
3. Does the user want queue visualization in the dashboard (per-profile queue depth, wait time)?

## Sources

- Code: `open-sse/services/smartRouter.js` (classifyTask — tag mapping source)
- Prior research: `2026-09-14-keyless-governance-research.md` (priority queue, tag/keyword sections)
- Industry: Wikipedia WFQ (Parekh & Gallager 1993; fetched 2026-09-15), WF2Q+ (Bennett & Zhang 1996), general queueing theory