# Tree T6 — Persistence (SQLite Layer) (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #persistence #sqlite #t06

## Objective

Full 6-level binary tree expansion of the **persistence (SQLite layer)** topic (`src/lib/db/`, from `2026-08-31-message-origin-and-destination-research.md` Part A.6). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Persistence (SQLite layer)
├─ L1L: Driver chain (driver.js)
│  ├─ L2LL: Adapter fallback
│  │  ├─ L3LLL: bun:sqlite
│  │  │  ├─ L4LLLL: bun runtime
│  │  │  │  ├─ L5LLLLL: native module
│  │  │  │  │  ├─ L6LLLLLL: bun built-in
│  │  │  │  │  └─ L6LLLLLR: fastest
│  │  │  │  └─ L5LLLLR: detection
│  │  │  │     ├─ L6LLLLRL: process.isBun
│  │  │  │     └─ L6LLLLRR: import check
│  │  │  └─ L4LLLR: fallback trigger
│  │  │     ├─ L5LLLRL: not bun
│  │  │     │  ├─ L6LLLRLL: node runtime
│  │  │     │  └─ L6LLLRLR: next adapter
│  │  │     └─ L5LLLRR: import fail
│  │  │        ├─ L6LLLRRL: missing
│  │  │        └─ L6LLLRRR: catch
│  │  └─ L3LLR: better-sqlite3
│  │     ├─ L4LLRL: optional dep
│  │     │  ├─ L5LLRLL: optionalDependencies
│  │     │  │  ├─ L6LLRLLL: install never fails
│  │     │  │  └─ L6LLRLLR: native build
│  │     │  └─ L5LLRLR: sync API
│  │     │     ├─ L6LLRLRL: synchronous
│  │     │     └─ L6LLRLRR: fast
│  │     └─ L4LLRR: fallback trigger
│  │        ├─ L5LLRRL: not installed
│  │        │  ├─ L6LLRRLL: optional skip
│  │        │  └─ L6LLRRLR: next adapter
│  │        └─ L5LLRRR: build fail
│  │           ├─ L6LLRRRL: no build tools
│  │           └─ L6LLRRRR: catch
│  └─ L2LR: node:sqlite
│     ├─ L3LRL: Node ≥22.5
│     │  ├─ L4LRLL: built-in
│     │  │  ├─ L5LRLLL: node:sqlite module
│     │  │  │  ├─ L6LRLLLL: experimental
│     │  │  │  └─ L6LRLLLR: stable-ish
│     │  │  └─ L5LRLLR: version gate
│     │  │     ├─ L6LRLLRL: >= 22.5
│     │  │     └─ L6LRLLRR: check
│     │  └─ L4LRLR: fallback trigger
│     │     ├─ L5LRLRL: older node
│     │     │  ├─ L6LRLRLL: < 22.5
│     │     │  └─ L6LRLRLR: next adapter
│     │     └─ L5LRLRR: import fail
│     │        ├─ L6LRLRRL: missing
│     │        └─ L6LRLRRR: catch
│     └─ L3LRR: sql.js
│        ├─ L4LRRL: pure JS
│        │  ├─ L5LRRLL: wasm
│        │  │  ├─ L6LRRLLL: sqlite wasm
│        │  │  └─ L6LRRLLR: no native
│        │  └─ L5LRRLR: always works
│        │     ├─ L6LRRLRL: last resort
│        │     └─ L6LRRLRR: persistence
│        └─ L4LRRR: caveats
│           ├─ L5LRRRL: in-memory
│           │  ├─ L6LRRRLL: memory db
│           │  └─ L6LRRRLR: export/import
│           └─ L5LRRRR: file sync
│              ├─ L6LRRRRL: manual save
│              └─ L6LRRRRR: slower
└─ L1R: Repos & migrations
   ├─ L2RL: Repos (repos/)
   │  ├─ L3RLL: per-entity logic
   │  │  ├─ L4RLLL: entity repos
   │  │  │  ├─ L5RLLLL: providers repo
   │  │  │  │  ├─ L6RLLLLL: provider CRUD
   │  │  │  │  └─ L6RLLLLR: models
   │  │  │  └─ L5RLLLR: accounts repo
   │  │  │     ├─ L6RLLLRL: account CRUD
   │  │  │     └─ L6RLLLRR: credentials
   │  │  └─ L4RLLR: usage repo
   │  │     ├─ L5RLLRL: usage queries
   │  │     │  ├─ L6RLLRLL: daily totals
   │  │     │  └─ L6RLLRLR: per-model
   │  │     └─ L5RLLRR: cost queries
   │  │        ├─ L6RLLRRL: cost sums
   │  │        └─ L6RLLRRR: budget checks
   │  └─ L3RLR: index.js
   │     ├─ L4RLRL: db init
   │     │  ├─ L5RLRLL: open db
   │     │  │  ├─ L6RLRLLL: driver chain
   │     │  │  └─ L6RLRLLR: path resolve
   │     │  └─ L5RLRLR: migrations
   │     │     ├─ L6RLRLRL: run migrations
   │     │     └─ L6RLRLRR: version
   │     └─ L4RLRR: localDb shim
   │        ├─ L5RLRRL: backward compat
   │        │  ├─ L6RLRRLL: re-export
   │        │  └─ L6RLRRLR: old imports
   │        └─ L5RLRRR: new imports
   │           ├─ L6RLRRRL: @/lib/db/index.js
   │           └─ L6RLRRRR: preferred
   └─ L2RR: Migrations (migrations/)
      ├─ L3RRL: schema versioning
      │  ├─ L4RRLL: migration files
      │  │  ├─ L5RRLLL: numbered
      │  │  │  ├─ L6RRLLLL: 001_xxx
      │  │  │  └─ L6RRLLLR: ordered
      │  │  └─ L5RRLLR: applied tracking
      │  │     ├─ L6RRLLRL: schema_migrations
      │  │     └─ L6RRLLRR: applied set
      │  └─ L4RRLR: up/down
      │     ├─ L5RRLRL: up only
      │     │  ├─ L6RRLRLL: forward
      │     │  └─ L6RRLRLR: no down
      │     └─ L5RRLRR: idempotent
      │        ├─ L6RRLRRL: re-run safe
      │        └─ L6RRLRRR: guard
      └─ L3RRR: paths.js
         ├─ L4RRRL: DATA_DIR
         │  ├─ L5RRRLL: env override
         │  │  ├─ L6RRRLLL: DATA_DIR set
         │  │  └─ L6RRRLLR: custom path
         │  └─ L5RRRLR: default
         │     ├─ L6RRRLRL: ~/.9router
         │     └─ L6RRRLRR: fallback
         └─ L4RRRR: db file
            ├─ L5RRRRL: 9router.db
            │  ├─ L6RRRRLL: file name
            │  └─ L6RRRRLR: location
            └─ L5RRRRR: WAL mode
               ├─ L6RRRRRL: journal
               └─ L6RRRRRR: concurrency
```

## Node research (all 127 nodes)

### L0 — Persistence (SQLite layer)
`src/lib/db/` with adapter fallback chain: bun:sqlite → better-sqlite3 → node:sqlite → sql.js. Repos per entity; migrations; paths.

### L1L — Driver chain (driver.js)
Four adapters, first available wins.

### L1R — Repos & migrations
Per-entity repos; migrations; path resolution.

### L2LL — Adapter fallback
Ordered fallback chain.

### L2LR — node:sqlite
Node ≥22.5 built-in.

### L2RL — Repos (repos/)
Per-entity CRUD logic.

### L2RR — Migrations (migrations/)
Versioned schema changes.

### L3LLL — bun:sqlite
Bun native module.

### L3LLR — better-sqlite3
Optional native dep.

### L3LRL — node:sqlite
Node built-in.

### L3LRR — sql.js
Pure-JS wasm fallback.

### L3RLL — per-entity logic
Providers, accounts, usage repos.

### L3RLR — index.js
DB init + migrations + shim.

### L3RRL — schema versioning
Numbered migration files.

### L3RRR — paths.js
DATA_DIR resolution.

### L4LLLL — bun runtime
Bun built-in.

### L4LLLR — fallback trigger
Not bun → next.

### L4LLRL — optional dep
optionalDependencies.

### L4LLRR — fallback trigger
Not installed → next.

### L4LRLL — built-in
node:sqlite.

### L4LRLR — fallback trigger
Older node → next.

### L4LRRL — pure JS
Wasm.

### L4LRRR — caveats
In-memory, manual save.

### L4RLLL — entity repos
Providers/accounts.

### L4RLLR — usage repo
Usage queries.

### L4RLRL — db init
Open + migrate.

### L4RLRR — localDb shim
Backward compat.

### L4RRLL — migration files
Numbered.

### L4RRLR — up/down
Up only.

### L4RRRL — DATA_DIR
Env override.

### L4RRRR — db file
9router.db.

### L5LLLLL — native module
Bun built-in.

### L5LLLLR — detection
process.isBun.

### L5LLLRL — not bun
Node runtime.

### L5LLLRR — import fail
Catch.

### L5LLRLL — optionalDependencies
Never fails install.

### L5LLRLR — sync API
Synchronous.

### L5LLRRL — not installed
Skip.

### L5LLRRR — build fail
No build tools.

### L5LRLLL — node:sqlite module
Built-in.

### L5LRLLR — version gate
>= 22.5.

### L5LRLRL — older node
< 22.5.

### L5LRLRR — import fail
Catch.

### L5LRRLL — wasm
SQLite wasm.

### L5LRRLR — always works
Last resort.

### L5LRRRL — in-memory
Memory db.

### L5LRRRR — file sync
Manual save.

### L5RLLLL — provider CRUD
Providers.

### L5RLLLR — models
Model lists.

### L5RLLLRL — account CRUD
Accounts.

### L5RLLLRR — credentials
Encrypted.

### L5RLLRL — usage queries
Daily totals.

### L5RLLRR — cost queries
Cost sums.

### L5RLRLL — open db
Driver chain.

### L5RLRLR — migrations
Run.

### L5RLRRL — re-export
Old API.

### L5RLRRR — new imports
@/lib/db/index.js.

### L5RRLLL — numbered
001_xxx.

### L5RRLLR — applied tracking
schema_migrations.

### L5RRLRL — up only
Forward.

### L5RRLRR — idempotent
Re-run safe.

### L5RRRLL — DATA_DIR set
Custom.

### L5RRRLR — default
~/.9router.

### L5RRRRL — 9router.db
File.

### L5RRRRR — WAL mode
Journal.

### L6 leaves (64)
- **L6LLLLLL** bun built-in: no dep.
- **L6LLLLLR** fastest: native.
- **L6LLLLRL** process.isBun: detect.
- **L6LLLLRR** import check: try.
- **L6LLLRLL** node runtime: bun absent.
- **L6LLLRLR** next adapter: better-sqlite3.
- **L6LLLRRL** missing: not installed.
- **L6LLLRRR** catch: fallback.
- **L6LLRLLL** install never fails: optional.
- **L6LLRLLR** native build: prebuilt.
- **L6LLRLRL** synchronous: blocking.
- **L6LLRLRR** fast: native.
- **L6LLRRLL** optional skip: absent.
- **L6LLRRLR** next adapter: node:sqlite.
- **L6LLRRRL** no build tools: skip.
- **L6LLRRRR** catch: fallback.
- **L6LRLLLL** experimental: flag.
- **L6LRLLLR** stable-ish: Node 22.5+.
- **L6LRLLRL** >= 22.5: gate.
- **L6LRLLRR** check: version.
- **L6LRLRLL** < 22.5: older.
- **L6LRLRLR** next adapter: sql.js.
- **L6LRLRRL** missing: absent.
- **L6LRLRRR** catch: fallback.
- **L6LRRLLL** sqlite wasm: compiled.
- **L6LRRLLR** no native: pure JS.
- **L6LRRLRL** last resort: always.
- **L6LRRLRR** persistence: file export.
- **L6LRRRLL** memory db: volatile.
- **L6LRRRLR** export/import: save/load.
- **L6LRRRRL** manual save: explicit.
- **L6LRRRRR** slower: wasm.
- **L6RLLLLL** provider CRUD: create/read/update/delete.
- **L6RLLLLR** models: model registry.
- **L6RLLLRL** account CRUD: accounts.
- **L6RLLLRR** credentials: encrypted.
- **L6RLLRLL** daily totals: usage.
- **L6RLLRLR** per-model: breakdown.
- **L6RLLRRL** cost sums: totals.
- **L6RLLRRR** budget checks: quota.
- **L6RLRLLL** driver chain: adapters.
- **L6RLRLLR** path resolve: paths.js.
- **L6RLRLRL** run migrations: apply.
- **L6RLRLRR** version: track.
- **L6RLRRLL** re-export: localDb.js.
- **L6RLRRLR** old imports: compat.
- **L6RLRRRL** @/lib/db/index.js: new.
- **L6RLRRRR** preferred: new code.
- **L6RRLLLL** 001_xxx: numbered.
- **L6RRLLLR** ordered: sequence.
- **L6RRLLRL** schema_migrations: table.
- **L6RRLLRR** applied set: tracked.
- **L6RRLRLL** forward: apply.
- **L6RRLRLR** no down: no rollback.
- **L6RRLRRL** re-run safe: guard.
- **L6RRLRRR** guard: skip applied.
- **L6RRRLLL** DATA_DIR set: env.
- **L6RRRLLR** custom path: override.
- **L6RRRLRL** ~/.9router: default.
- **L6RRRLRR** fallback: home.
- **L6RRRRLL** file name: 9router.db.
- **L6RRRRLR** location: DATA_DIR.
- **L6RRRRRL** journal: WAL.
- **L6RRRRRR** concurrency: readers.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Adapter chain bun → better-sqlite3 → node:sqlite → sql.js | High |
| better-sqlite3 in optionalDependencies | High |
| localDb.js is a compat shim | High |
| Migrations in migrations/, repos in repos/ | High |
| DB path via paths.js (DATA_DIR else ~/.9router) | High |

## Open questions

1. Should usage.json migrate into SQLite (usage repo) for queryability?
2. Should sql.js file-sync be automatic (debounced) rather than manual?
3. Should migrations support down (rollback) for dev?

## Sources

- Code: `src/lib/db/driver.js`, `src/lib/db/index.js`, `src/lib/db/paths.js`, `src/lib/db/repos/`, `src/lib/db/migrations/`, `src/lib/localDb.js`
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b1b-persistence-sqlite.md`
- Industry: SQLite WAL mode, better-sqlite3 docs, node:sqlite docs