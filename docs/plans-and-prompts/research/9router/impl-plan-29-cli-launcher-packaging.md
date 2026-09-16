---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cli, launcher, tray, packaging, install
---

# Implementation Plan 29 — CLI Launcher & Packaging Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "CLI/launcher" option: harden the `9router` CLI launcher package — install reliability, tray behavior, and packaging.

## 1. Goal

Harden the `9router` CLI launcher: reliable install (postinstall hooks, sqlite runtime), robust tray behavior, clean packaging (npm pack), and version alignment with the server.

## 2. Background (from research)

- **9Router current state**: `cli/` package with postinstall.js, sqliteRuntime.js, trayRuntime.js; build-cli.js; independent versioning.
- **Research findings**: install failures come from native deps (sqlite); tray needs crash recovery; packaging must include all assets; version drift between CLI and server causes confusion.

## 3. Design

### 3.1 Install Reliability

- **Postinstall audit**: verify postinstall hooks (sqlite runtime detection).
- **Fallback chain**: sqlite runtime fallback (bun → better-sqlite3 → node:sqlite → sql.js).
- **Install diagnostics**: clear error messages with resolution steps.

### 3.2 Tray Robustness

- **Tray crash recovery**: auto-restart tray on crash.
- **Tray state**: tray state persisted; restored on restart.
- **Tray actions**: start/stop/restart/open dashboard with confirmation.

### 3.3 Packaging

- **Pack audit**: verify npm pack contents (all assets).
- **Asset completeness**: check for missing files in package.
- **Size control**: exclude unnecessary files.

### 3.4 Version Alignment

- **Version check**: CLI checks server version on start.
- **Version warning**: warn on mismatch.
- **Version sync**: aligned release process.

## 4. Implementation Steps

1. Audit postinstall + sqlite runtime.
2. Harden tray (crash recovery, state).
3. Audit packaging.
4. Add version alignment.
5. Tests: install, tray, pack.

## 5. Files Touched

- `cli/hooks/postinstall.js`
- `cli/hooks/sqliteRuntime.js`
- `cli/hooks/trayRuntime.js`
- `cli/scripts/build-cli.js`
- `cli/package.json`
- `tests/unit/cli-packaging.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Native dep failures | Fallback chain; diagnostics |
| Tray instability | Crash recovery |
| Pack omissions | Asset audit |
| Version drift | Version check |

## 7. Success Criteria

- Install works without native build tools.
- Tray recovers from crashes.
- Pack contains all assets.
- Version mismatch warned.

## 8. Related Plans
- Plan 17 (Node Failover) — packaging fixes.
- Plan 10 (Security) — install security.
- Plan 12 (UX) — tray UX.