# Epic Plan: Merge upstream decolua/9router master into local v1-bug-fix

**Date:** 2026-09-10
**Status:** active (planning phase complete, execution carded)
**Tags:** #merge #upstream #git #planning #epic
**Thread:** 1544031399110119588 (ALL cards report here)
**Guardrail:** Any card created by a card MUST inherit thread subscription + card-creation permission, with this same guardrail embedded in its body.

---

## 1. Objective

Bring the local 9router codebase (**branch `v1-bug-fix`, v0.5.50**) up to date with upstream **`decolua/9router` master (v0.5.59+)** — including the 54 community PRs merged as #3694 and the ~30 PRs merged Sep 8–10 — while preserving our local custom work (failover proxy, per-IP rate limiter, WAL fixes, tray fixes, plans-and-prompts docs).

## 2. Current Git State (verified 2026-09-10)

```
Branch:        v1-bug-fix (checked out)
Local commits ahead of origin/master: 20+ (34f518e4 → fdf82774)
Working tree:  DIRTY — ~30 modified files (combos, cli/package.json, trayRuntime.js,
               custom-server.js, api routes, db repos, README/i18n)
Remote:        origin → git@github.com:decolua/9router.git (the upstream repo itself)
Upstream:      master branch local tracking exists (origin/master)
```

### 2.1 What we have that upstream may not (local-only work)
- `failover-proxy.cjs` packaging fix (`cli/package.json` files array + failover feature set)
- Per-IP rate limiter bundled into CLI package (48bca50f)
- WAL checkpoint TRUNCATE→PASSIVE fixes (34f518e4, 06f735c6)
- Tray runtime changes (`cli/hooks/trayRuntime.js` — uncommitted!)
- Combo/Models feature work (6754d9c0 + uncommitted combos UI changes)
- Plans-and-prompts knowledge base (docs only, no conflict risk)

### 2.2 Upstream merged recently (Sep 8–10, from GitHub API)
- #3694 feat: 54 community PRs integrated into v0.5.59 + CommandCode quota
- #3892 antigravity weekly quota + free-tier handling
- #3921 xiaomi-desktop (MiMo Desktop provider)
- #3926 Claude tool type scoping
- #3948 Claude cache_control 4-marker budget
- #3950 cline/airforce envelope unwrap
- #3923 ClinePass API key prefix fix
- #3947 deepseek tool type stripping
- #3949 kiro systemPrompt fix
- #3938 codex Unicode-property tool schema
- #3924 Qoder usage streaming fix
- #3943 codex gpt-image-2.5/flare/sunburst
- #3912 video: OpenRouter + Vertex AI (Veo)
- #3940 codebuddy deepseek-v4.1-flash
- #2698 headroom before translation
- #3261 proxy: rotate no-auth pools after rate limits
- #3944 standalone Qwen provider
- #3941 stale keep-alive socket hang fix
- #3935/#3934 provider sorting/hiding
- #3776 kiro runtime surfaces
- #3132 elevenlabs TTS panel
- #3328 provider brand icon test
- #3830 stale lock clearing
- #3847 Fable weekly limit parsing
- #3542 client hang-up turn recording
- #3904 String Web Access provider
- #3902 Responses SSE assembly
- #3900 MITM sudo-password cache
- #3899 CommandCode quota tracking
- 20+ OPEN PRs (#3954, #3945, #3942, #3936, #3931, #3919, #3917, #3914, #3913, #3911, #3910, #3909, #3908, #3907, #3903, #3896, #3894, #3888, #3887, #3886) — evaluate separately

## 3. Strategy Decision (pending review by cards)

| Option | When to use | Risk |
|--------|-------------|------|
| **A. git merge origin/master** | Keep our commit history + upstream as merge commit | Conflicts in heavily-touched files (combos, cli/package.json, custom-server.js, db repos) |
| B. git rebase v1-bug-fix onto origin/master | Linear history, our commits replayed on top | Rewrites history; requires force-push if shared; more conflict iterations |
| C. Cherry-pick upstream PRs individually | Maximum control | Tens of picks; dependency chains between PRs; high effort |
| **Recommended: A** (merge) with option C as fallback for specific PRs that conflict badly |

### 3.1 Conflict expectations
- `cli/package.json` — we added `failover-proxy.cjs` to files; upstream may have changed deps/files. LOW-MEDIUM.
- `cli/hooks/trayRuntime.js` — UNCOMMITTED local changes; upstream may not touch it. LOW.
- `custom-server.js` — we have L1 + rate limiter changes; upstream #3261 touches proxy/rotation but maybe not this file. MEDIUM.
- `open-sse/services/combo.js` + combos UI — we have major uncommitted work; upstream #3694 likely touches combos heavily. HIGH.
- `src/lib/db/repos/*` — our alias/connections/settings changes; upstream schema additions. MEDIUM.
- `src/app/api/combos/*`, `providers/*` — uncommitted local. HIGH.

### 3.2 Pre-merge safety (MANDATORY — never skip)
1. Commit or stash ALL working-tree changes (30+ files) — NO uncommitted state during merge
2. Create backup branch `v1-bug-fix-backup-<date>` or tag
3. `git fetch origin` then diff stats before merging
4. Run tests AFTER merge; fix regressions before any deploy

## 4. Execution Phases + Card Map

### PHASE 0 — Governance (1 card)
- MERGE-00: Epic governance — every card subscribes thread, may create children with same guardrail

### PHASE 1 — Research/Inventory (7 cards)
- MERGE-01: Inventory merged upstream PRs (Sep 2026) → doc
- MERGE-02: Inventory open upstream PRs worth pulling
- MERGE-03: Full divergence analysis (git log origin/master..HEAD and HEAD..origin/master)
- MERGE-04: Map local commits → upstream equivalents (dedupe)
- MERGE-05: Conflict-risk file analysis (per-file diff preview)
- MERGE-06: Changelog/version delta review (0.5.50 → 0.5.59+)
- MERGE-07: Dependency changes audit (package.json/lockfile)

### PHASE 2 — Prepare local (3 cards)
- MERGE-08: Commit/stash working tree cleanly
- MERGE-09: Create backup branch + tag
- MERGE-10: Fetch upstream + record pre-merge baseline (test run)

### PHASE 3 — Merge execution (4 cards)
- MERGE-11: Create merge branch `merge-upstream-<date>` from v1-bug-fix
- MERGE-12: Run `git merge origin/master` — keep our packaging/rate-limiter/WAL fixes
- MERGE-13: Resolve conflicts (cli/ → open-sse/ → src/ → docs)
- MERGE-14: Update version/lockfile + rebuild CLI package

### PHASE 4 — Verification (4 cards)
- MERGE-15: `npm run build` + vitest suite
- MERGE-16: Runtime smoke on mini2 (providers/models/chat)
- MERGE-17: Tray + dashboard functional check
- MERGE-18: Regression review vs our 20 local commits' features

### PHASE 5 — Deploy/Follow-up (2 cards)
- MERGE-19: Deploy updated package to mini2 (npm install -g rebuilt tarball)
- MERGE-20: Post-merge issue triage + plan updates

### PARALLEL TRACK — Tray freeze (2 cards)
- TRAY-01: Implement CGO ActivationPolicy shim + build integration + heartbeat watchdog (research in 30-tray-freeze-root-cause-fix.md)
- TRAY-02: Alternative .app bundle approach evaluation

## 5. Deliverables

- `docs/plans-and-prompts/research/9router/31-upstream-pr-inventory.md` — full PR catalog (started from live API data)
- `docs/plans-and-prompts/planning/upstream-merge-epic.md` — this file
- ~22 kanban cards on board `9router`, all subscribed to thread 1544031399110119588, all permitted to spawn children with same guardrail

## 6. Acceptance

- Upstream master changes merged into a branch derived from v1-bug-fix, all local custom features verified present post-merge, test suite green, mini2 runtime smoke passes, tray fix landed, docs updated.