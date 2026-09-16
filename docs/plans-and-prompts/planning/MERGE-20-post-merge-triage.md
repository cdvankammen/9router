# MERGE-20: Post-Merge Triage Report

**Date:** 2026-09-10 ~22:15 MDT
**Host:** mini.local (chris)
**Branch:** merge-upstream-20260910
**Merge commit:** 0ea23708 (resolved), HEAD=f1cdbed0
**Version:** 0.5.75

## 1. Merge State

- Merge committed at 0ea23708, zero conflict markers in HEAD tree.
- 130 commits ahead of origin/master, 0 behind — upstream fully integrated.
- 3 post-merge fixup commits by other workers: .gitignore fix, JSX button fix, tray+registry fix.
- Working tree clean except .gitignore (4 lines deleted, trivial).

## 2. Must-Keep Features Verification

| Feature | Status | Evidence |
|---------|--------|----------|
| WAL PASSIVE (3 adapters) | VERIFIED | betterSqliteAdapter.js:25,30,48; bunSqliteAdapter.js:24,29,56; nodeSqliteAdapter.js:37,42,77 |
| Per-IP rate limiter | VERIFIED | cli/scripts/build-cli.js + custom-server.js contain rate-limit refs |
| failover-proxy.cjs packaging | VERIFIED | cli/package.json files array includes "failover-proxy.cjs" |
| Tray watchdog/keepalive | VERIFIED | cli/src/cli/tray/tray.js lines 336-374 (keepalive + watchdog comments + logic) |

All 4 must-keep features survived the merge intact.

## 3. Service Health (mini2)

- 9router launchd job: com.9router.app loaded (PID 93910)
- Port 20128: LISTENING (node PID 93952)
- Tray logs: /tmp/9r-app-tray.log shows repeated start/shutdown cycles (v0.5.50 banner), last entry is a clean start. No crash loops or error spam.
- Error log: /tmp/9r-app-tray.err.log is 0 bytes.
- ~/.9router/logs/: only mitm/ subdir (empty). No runtime error logs.
- **NOTE:** Router on mini2 is still running v0.5.50 binary. MERGE-19 (deploy) has not executed yet — the merged v0.5.75 package is NOT installed on mini2.

## 4. Gateway Log Errors (mini2) — classified 22:30 MDT

- 588 lines matching 'error' in last 400KB of ~/.hermes/logs/gateway.log.
- Root cause: Discord 429 rate-limit storm (~21:57) — 182 `discord.errors.HTTPException: 429 Too Many Requests`, 3 `sqlite3.OperationalError: database is locked`, rest cascaded Discord send failures. Known-fleet issue (kanban notification fan-out), NOT router-related.
- ZERO 9router/provider HTTP 4xx/5xx errors found.
- Router's own logs clean: /tmp/9r-app-tray.err.log is 0 bytes, tray.log shows clean start/shutdown cycles only.
- **Verdict: no router-attributable errors in the observation window.**

## 5. Epic Card Status

| Card | Status | Notes |
|------|--------|-------|
| MERGE-13 (resolve conflicts) | done | |
| MERGE-14 (version/rebuild) | done | |
| MERGE-15 (npm build + vitest) | running | In progress |
| MERGE-16 (runtime smoke mini2) | todo | Blocked on MERGE-15 + MERGE-19 |
| MERGE-17 (tray + dashboard) | done | |
| MERGE-18 (regression review) | done | |
| MERGE-19 (deploy to mini2) | todo | Not started |
| TRAY-01 (ActivationPolicy) | running | Parallel track |

**Verdict:** Epic is NOT stable. Cannot close. MERGE-15 and MERGE-19 must complete first.

## 6. Thread Subscription

- t_b890d9a4 subscribed to discord:1544031399110119588:1544031399110119588 (verified in DB).
- BOARD_THREADS mapping confirmed: 9router -> 1544031399110119588 in common.py line 42.

## 7. Plans Updated

- upstream-merge-epic.md status updated from 'active (planning phase complete)' to 'execution phase — merge committed, verification in progress'.

## 8. Follow-up Machinery

- Child card [MERGE-20A] t_0a9cf543 created, dependency-gated on MERGE-15 + MERGE-16 + MERGE-19. It will: snapshot a T0 baseline after deploy, watch 24h (self-respawning continuation children), triage new errors into bug cards, and close epic t_4f254fe1 + flip the plan status to 'stable' only when a clean 24h window completes.
- Epic t_4f254fe1 deliberately NOT closed: MERGE-15 (tests) still running, MERGE-16/MERGE-19 not started; mini2 still runs v0.5.50.
