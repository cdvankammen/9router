# ADR-011: v3 is the sole write branch — v2 frozen, master off-limits

**Date:** 2026-09-16
**Author:** Hermes Agent (direction: Chris / csnoopy35, Discord thread 1544031399110119588)
**Status:** accepted
**Tags:** #adr #git #branching #worktrees #v3 #v2 #master #kanban

## Context

The 9router repository accumulated branch and worktree sprawl while `v2` was being assembled:

- `v2` reached its final state by merging ~30 task branches (`gap-p0-*`, `gap-p1-*`, `gap-p2-*`,
  `9router/t_*`, `pr-3595-squash`) plus an upstream `origin/master` merge, ending at
  `d7a9ee5d` ("docs: record v2 merge completion, test reconciliation, and mini2 deploy").
- ~51 local branches and ~35 registered worktrees remain, split across two naming conventions
  (`/Users/chris/Documents/GitHub/9router-wt-t_<id>` and
  `/Users/chris/Documents/GitHub/9router/worktrees/t_<id>`).
- 13 cards on the `9router` kanban board are still open/blocked and will be executed later.
- Three branches (`pr-3610`, `pr-3625`, `feat/multi-protocol-custom-providers`) are 1 commit
  ahead of `v2` and hold unreviewed candidate work.

Without a single designated write target, each future card would create its own branch and its
own worktree, and some would attempt to merge to `master`. That guarantees divergence, makes
the v2 baseline unreproducible, and risks shipping unreviewed work to `master`.

## Decision

`v3` is created as an exact copy of `v2` (`git branch v3 v2`, tip `d7a9ee5d`, tree `7b164f57`) and
is **the only branch any agent may commit to**. Specifically:

1. All work happens on `v3`. No agent creates its own branch.
2. No agent creates its own worktree; worktrees are orchestrator/human-created only.
3. No agent merges into `master` without explicit, word-for-word instruction from Chris for that
   specific merge. Local merges, PRs, and "test merges" are all included in the prohibition.
4. `v2` is frozen and read-only — no commits, merges, resets, or force-pushes.
5. No agent commits or works on any other branch, checkout, or remote.

## Consequences

- **Positive:** one linear, auditable integration target; the v2 baseline stays reproducible for
  regression comparison; card work is trivially collectable; no accidental master shipping.
- **Positive:** because `v3` was branched from `v2`'s tip, every fix already merged into `v2`
  is present in `v3` with zero extra work — no re-merge required for the `gap-*` / `9router/t_*` work.
- **Negative / cost:** parallel cards can no longer be isolated by branch name; isolation must be
  provided by worktrees (orchestrator-controlled) or by serializing file-touching cards.
- **Negative / cost:** workers must actively verify `git rev-parse --abbrev-ref HEAD == v3` before
  committing, and block instead of switching branches on mismatch.
- **Follow-up:** the three v2+1 branches must be reconciled into `v3` by explicit decision, not by
  automatic merge.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep per-card task branches and merge each into `v3` | Re-creates exactly the branch sprawl that motivated this ADR; 30+ branches accumulated last time. |
| Continue merging task branches into `v2` | `v2` must stay frozen as the reference baseline; mutating it destroys reproducibility. |
| Branch per card from `master` | `master` is upstream's line; local work must not be based on it or merged into it. |
| Simply work on `master` directly | Explicitly forbidden — `master` requires per-merge human instruction. |
| Work on `v2` directly | Same problem as mutating the baseline; also destroys the ability to diff v2→v3. |

## Reversibility

Reversible with effort. Abandoning the policy means re-introducing per-card branches and merging
them elsewhere; the v3 branch can be deleted or repointed as long as no work has landed on it.
Irreversible aspect: once commits land on `v2` or `master`, the frozen baselines are gone.

## Enforcement

Policy published in three places (repo tracking doc, research V3 folder, kanban board
descriptions + card bodies) — see `../GIT-BRANCH-POLICY.md`.
