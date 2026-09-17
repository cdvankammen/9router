# Git Branch Policy — 9router repository

**Date:** 2026-09-16
**Author:** Hermes Agent (csnoopy35 direction, Discord thread 1544031399110119588)
**Status:** active
**Tags:** #git #branching #worktrees #policy #kanban #v3 #v2 #mandatory
**Applies to:** EVERY agent, worker, subagent, card, cron, and human session working in the
`9router` repository at `/Users/chris/Documents/GitHub/9router`.

> **This file is the canonical statement of the branch policy.** If any other doc, card body,
> or instruction contradicts it, this file wins. It is referenced by:
> - ADR-011 (`decisions/ADR-011-v3-branch-isolation.md`)
> - `~/Documents/hermesResearch/9router/V3/GIT-BRANCH-POLICY.md`
> - the `9router`, `9router-mcp-hub-kanban`, and `9router-mcp-hub-skills` kanban board descriptions
> - every card body on those boards (via the `BRANCH-RULE` block)

---

## 1. The rule (verbatim intent)

1. **ALL work happens on the `v3` branch. Nothing else. Ever.**
2. `v3` is a **copy of `v2`** — created at `v2`'s current tip and containing **all of v2's work**.
3. **No agent may create its own branch.** A worker does not invent `feature/x`, `gap-p1-xx/t_xxxx`,
   or any task-named branch.
4. **No agent may create its own worktree.** Worktrees are created only by the orchestrator /
   explicit human instruction. Workers cd into the workspace they are given and work there.
5. **No agent may merge into `master`.** Not with a PR, not locally, not "just to test".
   Merging to `master` requires **explicit, word-for-word instruction from Chris** for that
   specific merge.
6. **`v2` is FROZEN and must remain untouched.** No commits, no merges, no resets, no forced
   pushes, no worktree checkouts that write to it. Read-only reference only.
7. **No agent may commit or work anywhere else** — no other repo branch, no other checkout,
   no other remote, no `git stash`-based hopping between branches.

### Explicitly forbidden commands

```bash
git checkout -b <anything>        # creating a branch
git branch <anything>             # creating a branch
git switch -c <anything>          # creating a branch
git worktree add <path>           # creating a worktree
git merge ... master              # merging to master
git push origin master            # pushing master
git push --force / -f             # any forced push
git commit                        # on v2, master, or any branch other than v3
git reset --hard v2 / master      # rewriting frozen branches
git checkout v2 / master          # switching away from v3 to write
```

### The only allowed write target

```
branch:   v3
path:     /Users/chris/Documents/GitHub/9router
base:     d7a9ee5d  (v2 tip at time of policy creation — v3 == v2, byte-identical)
```

### Host isolation (Chris directive 2026-09-17)

- **CODE CHANGES**: on `mini` only, working directly in the v3 branch checkout at
  `/Users/chris/Documents/GitHub/9router`.
- **BUILD + RUN + VERIFY**: on `mini3`, `mini4`, or `mini5` ONLY. **NEVER mini** (VS Code may be
  running builds there — conflict risk). **NEVER mini2** (separate Slack bot host).
- **NEVER run the CLI version** — must run the actual app (Next.js dev server / production build).

### Worktree and branch strategy (Chris directive 2026-09-17)

- **ONE shared worktree** on the build host (mini3/4/5) for ALL cards. No per-card worktrees.
- **Branch strategy**: Cards MAY create feature branches (e.g., `feature/bug-3692-fix`) within the
  shared worktree for isolation during development. However:
  - All work must be **tested** on the feature branch
  - All work must be **merged into v3** (the integration branch) after testing passes
  - **v3 must always be working** — it is the stable integration target
  - No card may leave work stranded on a feature branch without merging to v3
- This allows parallel card work while maintaining v3 as the verified, working integration point.

### Mandatory QA gate (Chris directive, 2026-09-16)

Before ANY card on the 9router boards may be marked `done`, the worker MUST:

1. **Run the repo test suite on `v3`** and record pass/fail counts (e.g. `cd tests && npx vitest run`).
   Baseline at policy time (2026-09-16): **2657 passed / 76 failed / 17 expected-fail / 66 skipped** —
   known pre-existing failures include `unit/cursor-agent-proto.test.js` (35; upstream
   `open-sse/utils/cursorProtobuf.js` lacks `encodeAgentValue`) and `unit/security-audit.test.js`
   (13; test references `tests/src/...` path that does not exist). Any NEW failure introduced by a
   card must be fixed or justified before completion.
2. **Verify the change functionally** with at least one REAL check, choosing from:
   - headless browser (Playwright/Puppeteer/browser_exec) against the running dashboard —
     screenshot saved as evidence;
   - direct API/CLI invocation (curl / node script) proving the end-to-end behavior;
   - automated unit/integration test exercising the changed path (must pass).
3. **Record the evidence IN THE CARD** (`result` / comments): test counts, screenshots, or
   reproduction steps.
4. **NEVER commit outside `v3`.** No new branches. No worktrees. No merges to `master` without
   explicit, word-for-word instruction.

This gate is mirrored in every card body on the `9router`, `9router-mcp-hub-kanban`, and
`9router-mcp-hub-skills` boards as the `CARD-QA-GATE` block.

---

## 2. Why (context, 2026-09-16)

History that produced this rule:

- `v2` was built by merging ~30 task branches (`gap-p0-xx/t_xxxx`, `gap-p1-xx/t_xxxx`,
  `gap-p2-xx/t_xxxx`, `9router/t_xxxx`, `pr-3595-squash`) plus an upstream `origin/master`
  merge. That was deliberate and is now **complete and frozen**.
- The `9router` kanban board still carries **13 open/blocked cards** and the repo still has
  **~35 registered worktrees** plus branch names in both `9router-wt-t_<id>` (sibling dirs) and
  `9router/worktrees/t_<id>` locations.
- Three branches (`pr-3610`, `pr-3625`, `feat/multi-protocol-custom-providers`) are **1 commit
  ahead of v2** — unreviewed candidate work that must be reconciled *into v3* if it is wanted,
  never merged to master.
- Without a single designated write target, future cards would each spawn another branch and
  another worktree, which is exactly the sprawl this policy prevents.

---

## 3. What workers must do instead

Every `git add` / `git commit` a worker makes must land on **`v3`**. In order:

```bash
# 0. Verify you are on v3 BEFORE touching anything
cd /Users/chris/Documents/GitHub/9router
git rev-parse --abbrev-ref HEAD        # MUST print: v3
# If it does not print v3: STOP. Do not switch branches. Comment on your card and kanban_block.

# 1. Confirm v2 is pristine (read-only sanity check)
git rev-parse v2                        # MUST equal d7a9ee5d (or the current frozen tip)

# 2. Do the work in src/ , open-sse/ , cli/ , tests/ ... on v3

# 3. Commit to v3
git add -A
git commit -m "<type>(<scope>): <what> — <card id>"
```

- **If a card needs isolation**, request a worktree from the orchestrator — do not create one.
- **If a card believes it must merge to master**, that is a `kanban_block` with the reason
  `"master-merge requires explicit Chris instruction"`. It is never done autonomously.

---

## 4. Kanban board conformance

The following boards carry the `BRANCH-RULE` block in their description and in card bodies:

| Board | Thread | Repo scope |
|---|---|---|
| `9router` | 1544031399110119588 | 9router main repo — primary |
| `9router-mcp-hub-kanban` | 1543375661287342111 | 9router MCP hub (read-only w.r.t. the 9router repo) |
| `9router-mcp-hub-skills` | 1543370751191683082 | 9router MCP hub skills (read-only w.r.t. the 9router repo) |

The `provider-issues` board (thread 1547688080054423552) does **not** build the 9router repo —
it diagnoses the running 9router/Dialagram pipeline on mini2. It carries the same rule as a
prohibition (do not touch the repo; do not branch; do not merge), not as a write target.

---

## 5. Status of the frozen branches (2026-09-16)

```
v2     d7a9ee5d   FROZEN — read-only            (tip = "docs: record v2 merge completion, test reconciliation, and mini2 deploy")
v3     d7a9ee5d   ACTIVE WRITE TARGET           (created 2026-09-16 as an exact copy of v2; tree 7b164f57)
master 17c4cc76   OFF-LIMITS — requires explicit Chris instruction to merge into
```

Branches 1 commit ahead of v2 that still need reconciliation **into v3** (never into master):

| Branch | Behind v2 | Commit |
|---|---|---|
| `pr-3610` | 1 | `f9b271d8` feat(kiro): update model definitions and CLI tool mappings |
| `pr-3625` | 1 | `13784656` feat(kiro): flatten top-level tool schema combinators + degrade oversized payloads |
| `feat/multi-protocol-custom-providers` | 1 | `7d669a44` feat(providers): add multi-protocol custom providers |

Everything already merged into v2 (`gap-p0-*`, `gap-p1-*`, `gap-p2-*`, `9router/t_*`,
`pr-3595-squash`, `merge-upstream-20260910`) is **carried inside v3 automatically** because v3
was branched from v2's tip. Nothing needs re-merging.

Full completion record: `~/Documents/hermesResearch/9router/V3/completed-cards-last-7-days.md`
and `~/Documents/hermesResearch/9router/V3/completed-cards-recent-24-48h.md`.

---

## 6. Enforcement

- Board descriptions are read by every worker at claim time.
- Card bodies embed the `BRANCH-RULE` block; workers are told to re-embed it in any child card
  they create.
- Violations are `protocol_violation` events. If a worker commits to the wrong branch, the
  orchestrator records the incident on the card and re-runs the work on v3.

## Related

- ADR-011 — `decisions/ADR-011-v3-branch-isolation.md`
- `tracking/README.md` — tracking discipline
- `docs/plans-and-prompts/AGENTS.md` — plans-and-prompts writing conventions
