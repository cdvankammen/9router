# CLI Launcher & Test Suite — Deep Dive

**Date:** 2026-08-05
**Author:** Copilot Agent
**Status:** active
**Tags:** #research #cli #tests #vitest #baseline

## CLI Package (`cli/`) — 24 files, ~6,447 lines

Independent npm package published as `9router` v0.5.50. User-facing launcher that installs, starts, manages, and updates the gateway server.

### `cli.js` — Main Entry (~750 lines)
Subsystems:
1. **Subcommand dispatch** — `9router xai video` bypasses launcher
2. **Runtime self-healing** — Ensures SQLite and tray deps exist
3. **Argument parsing** — --port, --host, --no-browser, --tray, --skip-update
4. **Process management** — Cross-platform cleanup (WMI on Windows, ps on Unix)
5. **Update checking** — Parallel npm registry fetch with 3s timeout
6. **Server lifecycle** — Detached child spawn, crash recovery (max 2 restarts)
7. **Interface menu** — Interactive enquirer menu
8. **Tray mode** — macOS keeps process alive; Windows/Linux spawns detached

### Hooks
- `postinstall.js` — Calls ensureSqliteRuntime + ensureTrayRuntime
- `sqliteRuntime.js` — Manages sql.js + better-sqlite3 in ~/.9router/runtime/
- `trayRuntime.js` — Platform-specific tray binary management

### Build Scripts
- `build-cli.js` — Multi-step: version sync → Next.js build → standalone copy → asset bundling
- `buildMitm.js` — Esbuild bundles MITM proxy server

### Internal Modules (`src/cli/`)
terminalUI, tray (cross-platform), commands, API client, menus (providers, keys, combos, settings, CLI tools), utilities.

## Test Suite (`tests/`) — 194 files, ~28,014 lines

Independent ESM package using vitest v4.0.0. NOT wired into root npm test.

### Configuration
- `vitest.config.js` — Aliases resolve open-sse/ and @/ to repo root
- Max concurrency 60 for parallel real tests
- Excludes .claude/ worktrees

### Baseline Regression System (`__baseline__/`)
Snapshot comparison guarding against regressions:
- `known-fails.txt` — 26 catalogued expected failures
- `verify-no-regression.mjs` — Compares current results vs known-fails
- `providers-baseline.json` / `alias-baseline.json` / `oauth-urls-baseline.json` — Config snapshots
- Verify scripts for each baseline

### Translator Tests (`translator/`)
- **Tier 1**: coverage-all-models — Every model translates without throwing
- **Tier 2**: format-roundtrip — Core fields survive translation
- **Golden tests**: Snapshot-locked request/response translations
- **Bug exposure tests**: `it.fails()` for confirmed unfixed bugs
- **Real integration tests**: Gated by RUN_REAL=1, live provider calls

### Unit Tests (`unit/`) — Categorized
- Database & persistence (7 files)
- Translator & format translation (12 files)
- RTK token saver (5 files, 9 known fails)
- Provider-specific (35+ files)
- Routing & combo system (4 files)
- Capabilities & model info (4 files)
- Security & auth (6 files)
- Headroom compression (3 files)
- CLI build artifacts (2 files)
- Miscellaneous (20+ files)

### Coverage Gaps
1. No CLI launcher tests (process management, update checking, tray)
2. No build script unit tests
3. No hook tests (sqliteRuntime, trayRuntime)
4. Terminal UI and menu modules untested
5. Limited error path coverage
6. No concurrent translation safety tests
7. Windows-specific code largely untested
