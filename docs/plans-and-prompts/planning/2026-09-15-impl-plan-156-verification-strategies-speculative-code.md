# Implementation Plan 156 — Verification Strategies for Speculative Decoding — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #speculative #verification #tree-speculation #inference #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (draft selection from plan 155 (`src/lib/speculative/`); local inference from plan 92 (`open-sse/executors/local.js`); inference toolkit from plan 100).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — verification engine; tree speculation; tuning.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-156-verification-strategies-speculative.md`, `../research/9router/impl-plan-155-draft-model-selection.md`, `../research/9router/impl-plan-92-local-inference.md`.

## Scope

**In scope:** verification methods (greedy, sampled, cost); tree speculation (structure, parallel verification, pruning); parameter tuning (speculation length, thresholds, adaptive); integration.
**Out of scope:** draft model selection (plan 155); KV cache (plan 157).

## Milestones

### M1 — Verification engine

**Reference code (`src/lib/speculative/verify.js`):**

```js
// Verification methods: greedy / sampled.
export const VERIFY_METHODS = ["greedy", "sampled"];

// Greedy: accept draft tokens matching target's argmax.
export function greedyVerify({ draftTokens = [], targetLogits = [] } = {}) {
  let accepted = 0;
  for (let i = 0; i < draftTokens.length && i < targetLogits.length; i++) {
    const argmax = targetLogits[i].indexOf(Math.max(...targetLogits[i]));
    if (argmax === draftTokens[i]) accepted++;
    else break;
  }
  return { accepted, rejected: draftTokens.length - accepted };
}

// Sampled: accept with probability proportional to target probability.
export function sampledVerify({ draftTokens = [], targetProbs = [], rng = Math.random } = {}) {
  let accepted = 0;
  for (let i = 0; i < draftTokens.length && i < targetProbs.length; i++) {
    const p = targetProbs[i][draftTokens[i]] ?? 0;
    if (rng() < p) accepted++;
    else break;
  }
  return { accepted, rejected: draftTokens.length - accepted };
}

// Verification cost: tokens verified vs saved.
export function verifyCost({ accepted = 0, proposed = 0, targetCost = 1, draftCost = 0.1 } = {}) {
  const saved = accepted * targetCost;
  const spent = proposed * draftCost + proposed * targetCost; // draft + verify pass
  return { saved, spent, net: saved - spent };
}
```

**Acceptance criteria:** greedy; sampled; cost.

### M2 — Tree speculation

**Reference code (`src/lib/speculative/tree.js`):**

```js
// Tree speculation: multi-branch speculation.
export function makeTree({ branches = 4, depth = 4 } = {}) {
  // nodes: [{tokens, prob, children}]
  const root = { tokens: [], prob: 1, children: [] };
  return {
    root,
    addBranch(path) {
      let node = root;
      for (const step of path) {
        let child = node.children.find((c) => c.tokens.at(-1) === step.token);
        if (!child) {
          child = { tokens: [...node.tokens, step.token], prob: node.prob * step.prob, children: [] };
          node.children.push(child);
        }
        node = child;
      }
    },
    // Prune: drop low-probability branches.
    prune(minProb = 0.05) {
      const walk = (node) => {
        node.children = node.children.filter((c) => c.prob >= minProb);
        node.children.forEach(walk);
      };
      walk(root);
    },
    // Flatten: all leaf paths.
    leaves() {
      const out = [];
      const walk = (node) => {
        if (!node.children.length) out.push(node);
        else node.children.forEach(walk);
      };
      walk(root);
      return out;
    },
  };
}

// Parallel verification: verify all leaves, keep longest accepted.
export function verifyTree({ tree, verify } = {}) {
  const results = tree.leaves().map((leaf) => ({ leaf, ...verify(leaf.tokens) }));
  const best = results.sort((a, b) => b.accepted - a.accepted)[0];
  return { best, results };
}
```

**Acceptance criteria:** tree; pruning; parallel verify.

### M3 — Parameter tuning

**Reference code (`src/lib/speculative/tune.js`):**

```js
// Tuning: speculation length + thresholds.
export function tuneLength({ current = 4, acceptance = 0.5, min = 1, max = 16 } = {}) {
  // Higher acceptance → longer speculation.
  const next = Math.round(current * (0.5 + acceptance));
  return Math.max(min, Math.min(max, next));
}

// Adaptive threshold from metrics.
export function adaptThreshold({ current = 0.5, sample = 0.5, alpha = 0.1 } = {}) {
  return alpha * sample + (1 - alpha) * current;
}

// Efficiency: tokens per second improvement.
export function efficiency({ baseline = 1, speculative = 1 } = {}) {
  return { speedup: baseline / speculative, improved: speculative < baseline };
}
```

**Acceptance criteria:** length tuning; adaptive; efficiency.

### M4 — Integration + tests

**Reference code (`src/lib/speculative/integrate.js`):**

```js
// Inference integration: verification engine.
export function verifyStep({ method = "greedy", draftTokens = [], targetLogits = [], targetProbs = [] } = {}) {
  if (method === "sampled") return sampledVerify({ draftTokens, targetProbs });
  return greedyVerify({ draftTokens, targetLogits });
}

// Fail-open.
export function safeVerify(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/speculative/verify.js` (new), `src/lib/speculative/tree.js` (new), `src/lib/speculative/tune.js` (new), `src/lib/speculative/integrate.js` (new), `open-sse/executors/local.js` (integration), dashboard verification page (new), `tests/unit/verification.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Verification cost | No savings | Cost tracking |
| Tree complexity | Slow speculation | Pruning |
| Parameter drift | Suboptimal | Adaptive tuning |
| Quality | Wrong acceptance | Thresholds |

## Verification

- Unit: greedyVerify, sampledVerify, verifyCost, makeTree, verifyTree, tuneLength, adaptThreshold, efficiency, verifyStep
- Manual: greedy vs sampled; tree with pruning
- Regression: `tests/__baseline__/verify-no-regression.mjs`