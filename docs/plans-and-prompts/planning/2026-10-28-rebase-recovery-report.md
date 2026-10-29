# 9Router Rebase Work — Full Recovery Report
**Recovered:** 2026-10-28 from Copilot chat transcripts
**Sources:** Sep 14 session (552ecf4c), Oct 24 rebase-catalog, current git state

---

## Current Branch State (verified 2026-10-28)

| Branch | HEAD | Status |
|--------|------|--------|
| `v5-vscode-works` | `0e57ce82` | **Current HEAD** — 624 commits ahead of master |
| `v4-vscode-works` | — | 394 ahead of master |
| `v3` | `a17cfa30` | 270 ahead, 0 behind |
| `v2` | `d7a9ee5d` | 231 ahead, 0 behind — "source of truth" from Sep 14 |
| `v1` | `6754d9c0` | Untouched baseline |
| `master` (local) | `17c4cc76` | **274 commits behind origin/master** (stale) |
| `origin/master` | `3a978a63` | Tag v0.5.111 (2026-10-26) |

**Lineage:** master → v1 → v2 → v3 → (cherry-pick 156/213) → v4-vscode-works → v5-vscode-works

**57 v3 commits were never cherry-picked into v4/v5.**

---

## Phase 1: The Sep 14 Rebase (Session 552ecf4c)

### What Was Done
1. **Backup created:** `master-backup-20260914` at `304ffb88` + git bundle at `/tmp/9router-full-backup-20260914.bundle`
2. **Master reset** to pure `origin/master` (via worktree at `9router-wt-t_371f68a2`)
3. **v2 created** from v1, then merged origin/master (14 conflicts resolved)
4. **All 33 gap branches merged** into v2 in priority order P0→P1→P2→P3
5. **Build fixes** for 3 never-committed files: `responseValidator.js`, `smartRouter.js`, `executors/9router.js`

### Key Decisions
- master = pure upstream, v2 = source of truth
- Sequential merges (octopus failed)
- Union merges for handler signatures
- WAL PASSIVE kept over TRUNCATE
- JWT prod-fail-fast kept

### What Was NOT Completed (Sep 14)
- ❌ Clean build verification on v2
- ❌ Test suite run (kept stalling)
- ❌ JWT end-to-end verification
- ❌ plans-and-prompts documentation completeness

---

## Phase 2: The Sep 15 – Oct 27 Engineering Merge (Session 4efa60a4) ⭐ THE LOST CHAT

**Recovered from:** `~/Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat/session-store.db`
**Session ID:** `4efa60a4-c32e-42d2-a43a-712a1dde4eb4`
**Full transcript:** `.agent/recovered-chat-4efa60a4/full-transcript.md` (1.39 MB, 211 turns)
**Rebase arc (Oct 23-27):** `.agent/recovered-chat-4efa60a4/rebase-arc-oct23-27.md` (1.07 MB)
**Detailed analysis:** `.agent/recovered-chat-4efa60a4/rebase-arc-analysis.md`

### What It Was
A **`git merge`** (colloquially called "rebase") of `origin/master` (v0.5.95→v0.5.109, 106 commits) into `v4-vscode-works` (243 commits), producing branch **`v5-vscode-works`**.

### The Merge
- **Merge commit:** `664b0a42` — 462 files changed, +39,639/−2,199 lines, **21 conflicts** resolved
- **Branch lineage:** `v4-vscode-works` + `origin/master` → `v5-vscode-works`
- **Backup:** `v4-vscode-works-pre-rebase-20261003` (used to restore lost files during merge)
- **Result:** 100% upstream absorption verified; 350 commits ahead of origin/master, 0 behind

### Key Pre-Merge Commits (on v4-vscode-works)
| SHA | Description |
|-----|-------------|
| `2b63e0dd` | fix(rebase): restore ~40 lost test regressions |
| `fa2b99e8` | fix(rebase): resolve 13 post-rebase test regressions (35→22) |
| `e16a24a3` | fix(tests): unique timestamps for saveRequestUsage dedup |
| `5cc2b724` | fix(tests): request-details-tab 22/22 |
| `ca67b883` | fix(build): deleteSavedView import + model-context prerender |

### Post-Merge Commits (on v5-vscode-works)
| SHA | Description |
|-----|-------------|
| `b1cc8721` | combo.js structural fixes |
| `bef3747b` | Snapshot baseline |
| `a35f8c2b` / `1a7b15ac` | Audit catalog |
| `af9416c4` | combo.js scope refactor |
| `10772992` | 3 regression fixes (CAR block + failAttempt + 006-migration) |
| `3717cfef` | Security: `/api/export` forced JWT |
| `e75a22ba` | CRLF injection rejection |
| `a33e4c5a` | `/api/messages` JWT-gated |
| `03cce11e`→`4ae2cc1d` | CLI-tools → LOCAL_ONLY_PATHS |
| `90bc5935` | API key masking + settings sanitization |
| `ffbc8ca8` | headroomUrl SSRF guard |
| `6116cd96` | OIDC discovery SSRF + console-log JWT gate |
| `868f549c` | STT upload 25MB size guard |
| `103567e2` | `_rsc=` rate-limit bypass → page routes only |
| `5a3ab75d` | peerNodes URL validation (45/45 tests) |
| `f71b0d80` | `__proto__`/constructor/prototype hardening (5/5 tests) |
| `7c611d7c` | Link-local SSRF guard (27/27 tests) |
| `16cd790d` | IDOR `/api/keys/[id]` + unauthed `/api/version/shutdown` |
| `5a62a892` | aria-hidden a11y Sidebar + Header |
| `24f497b6` | Finding #7 middleware promotion (ALWAYS_PROTECTED) |
| `1ebed4fc` | Finding #7 route-level requireAuth |
| `27ff0cfa` | requireAuth on `/api/messages/[id]/actions` |
| `b1f9f1b6` | Clickjacking headers |
| `0e57ce82` | **Consolidated final report** (current HEAD) |

### Multi-Model Scrutiny
- **MiMo 2.6** via `curl` to mini2:20128/v1 — primary scrutinizer
- **3-perspective review** (Stage 3): SR (Security Researcher) / MT (Maintainer) / SRE on 40 HIGH/CRITICAL rows
- **Adversarial second-opinion** subagent at commit `bfc7d96f`
- **Cross-family review**: Xiaomi Mimo, Tencent Hy3, Meta Muse Spark, DeepSeek, Qwen

### Key Decisions
1. **da52d462 DROP** — System One / smartRouter dropped; upstream's systemoneRouter replaced it (smartRouter code remains inert)
2. **THE BIG DEDUP disproven** — 13 unique production fixes confirmed genuinely local (not upstream duplicates)
3. **Absorption rate corrected** — Initially reported 92.5%, re-verified to 100% (the 2 "missing" items were already ancestors of HEAD)
4. **CAR block recovery** — `contextRerouted` + `applyContextAwareRouting` lost in merge, recovered verbatim from `d8af862d`

### Final State
- **Branch:** `v5-vscode-works` @ `0e57ce82` — 350 ahead of origin/master, 0 behind
- **Tests:** 4815 pass / 54 fail (baseline 56) — **no regression**
- **Deployed:** Both mini2 (:20128) and mini4 (:20129) running build `FHPr0yRbAvd20el5zCSiv`, health=200
- **Final report:** `docs/plans-and-prompts/security/2026-10-27-consolidated-final-report.md`

### Unfinished Work (at chat end)
1. mini2 password plaintext recovery (bcrypt hash; solved via JWT mint)
2. open-claw feature-level implementation audit
3. Deep provider-level testing (40+ providers, needs live API keys)
4. Row 42 full call-site audit for legitimate self-signed users
5. Per-PR comment review of all upstream commits (skimmed only)
6. corsAllowedOrigins dead-code wiring (`resolveCorsHeaders` not imported)
7. Sidebar marketing links (9Remote/9English) — cosmetic
8. Confirmation token on cascading DELETE for `/api/provider-nodes/[id]`

### User's Standing Directives (verbatim)
- **Rebase definition:** "when i say rebase i mean all the code that is not mine pulled from origin made moved below all my work into the current branch"
- **Testing rigor:** "always always always and i say always be using the visual testing, and the dom testing and always the code testing"
- **Multi-model:** "use mimo 2.6 to scrutinize any plans, code changes etc" + use "distinct model families" for cross-review
- **Build location:** "always building this using mini4 or mini5 and running the tests on there" — NOT mini2 (RAM constraints)
- **Autonomy:** "dont just stop keep working and utilize the method i gave you so that you can work autonomously till the problem is solved"

---

## Phase 3: The Oct 24 Rebase Catalog (structured audit artifacts)

### Classification System
| Label | Meaning |
|-------|---------|
| TAKE-UPSTREAM | Accept upstream as-is |
| CLEAN-KEEP | Branch commit, no overlap |
| KEEP | Branch feature, replay verbatim |
| KEEP+MERGE | Requires surgical reconciliation |
| DROP | Superseded by upstream |
| DEDUP | Duplicate of upstream test-triage |
| DIVERGENT | Same file, different concern |

### Key Verdicts
1. **smartRouter.js → DROP ours, PREFER upstream #4975** (systemoneRouter.js, 1450 lines, 19 tests)
   - Cascade: 4 downstream commits DROP'd
   - Port items: activeRequests map, 30-min TTL, costQualityTradeoff settings
2. **2b63e0dd test fixes → KEEP+MERGE** (13/14 production fixes are unique to us)
3. **combo.js → 5-step merge order** (4 upstream edits first, our fallback-chain last)
4. **chatCore.js → 6-step signature merge** (customPrompt + conversationId)
5. **kiro.js → APPROVE** (orthogonal: request-side vs response-side)
6. **useModelCaps.js → APPROVE** (modelCapOverrides + resolveCaps coexist)

### Status: INCOMPLETE
- ✅ Stage 1: 106 upstream commits reviewed
- ✅ Stage 2: 243 branch commits reviewed  
- ⚠️ Stage 3: 7/15 scrutiny items have verdicts, 8 remain
- ❌ Stage 4: No execution (no replay scripts, no merge-order manifest)

### Open Stage 3 Items
1. `2c008011` — smart router taskType adaptation
2. `e2324257` — Messages URL capture (chatCore signature)
3. `681ea381` — token helpers (DEDUP re-verification)
4. `4013bfbf` — message-driven tool-building (45-file feature)
5. `729e786d` — 86 test failures fix (DEDUP re-verification)
6. `a68c4625` — claude-compat mega-commit (surgical replay)
7. `e4c1db96` — multi-protocol custom providers
8. `c804f787` — context-aware overflow routing

### Cascade Re-verification Needed
~12 DEDUP-classified commits assumed subsumed by upstream b6a9ca43 must be re-verified after the 2b63e0dd proof showed most were NOT duplicates.

---

## Unique Branch Features to Preserve (from v4/v5)
1. Observability: conversationId, error categorization, AI Error Analyst, markdown request log
2. Messages page: full list/detail/search/export, FTS5, Error Inbox
3. Fallback rule UI: provider picker, 5 rule views, drag-and-drop
4. Resilience: provider health + auto-disable, L1 peer forwarding
5. Streaming fixes: duplicate [DONE], JSON [DONE] leak
6. Settings hardening: deep-merge, sequential PATCH clobber fix
7. Security: CORS allowlist
8. Combo/model: duplicate button, dev flag, sorting, capability overrides
9. Claude-compat layer + model-context dashboard
10. Multi-protocol custom providers
11. Remote-only ollama serving

---

## Critical Issues Found

| Issue | Severity |
|-------|----------|
| Local master 274 commits behind origin | 🔴 High |
| 57 v3 commits never in v4/v5 | 🟡 Medium |
| Rebase catalog Stage 3/4 incomplete | 🔴 High |
| DEDUP cascade re-verification pending | 🟡 Medium |
| pre-rebase2-20261024 backup is identical to live | 🟢 Low |
| 2 prunable worktrees | 🟢 Low |
| 11 in-repo worktrees dirty | 🟡 Medium |

---

## Key Commit SHAs Reference

| SHA | Description |
|-----|-------------|
| `6754d9c0` | v1 tip — combo duplicate, model sorting, capability overrides |
| `d7a9ee5d` | v2 final — merge completion, test reconciliation, mini2 deploy |
| `a17cfa30` | v3 tip — context-aware overflow routing |
| `0e57ce82` | v5-vscode-works tip — security audit final |
| `17c4cc76` | local master — feat(claude-code) auto-compact |
| `3a978a63` | origin/master — v0.5.111 |
| `304ffb88` | master-backup-20260914 |
| `9515b459` | Merge origin/master into v2 |
| `2b63e0dd` | fix(rebase): restore ~40 lost test regressions |
| `b6a9ca43` | Upstream test-triage commit |
| `da52d462` | Our smartRouter (DROP'd for upstream #4975) |
