# Implementation Plan 33 — Documentation & Knowledge Base — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #documentation #knowledge-base #architecture-refresh #guides #api-docs #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, file structure, existing `docs/ARCHITECTURE.md`, `mkdocs.yml`, `README.md` patterns).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — build docs, check freshness, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-33-documentation-knowledge-base.md`, `../research/9router/48-branch-dashboard-and-ux.md` (docs tie-in)

## Scope

**In scope:** refresh ARCHITECTURE.md (SQLite layer, new flows, all plans); user guides (docs/guides/); per-provider docs (docs/providers/); auto-generated API/config/registry docs; doc freshness checks in CI; maintain ADRs + glossary.
**Out of scope:** external docs site hosting; video tutorials.

## Milestones

### M1 — ARCHITECTURE.md refresh

**Reference code (`docs/ARCHITECTURE.md` updates — sections to add/update):**

```markdown
## Persistence Layer (Updated 2026-09-15)
State is SQLite under `src/lib/db/` with adapter fallback chain:
bun:sqlite → better-sqlite3 → node:sqlite → sql.js.
New repos go in `src/lib/db/repos/`; export from `src/lib/db/index.js`.
Migrations in `src/lib/db/migrations/`.

## Error Handling (Updated 2026-09-15)
All errors use `errorEnvelope()` from `open-sse/config/errorEnvelope.js`.
Codes registered in `ERROR_CODES` (plan 09 + 19).
Circuit breakers: `open-sse/config/runtimeConfig.js`.

## Routing Pipeline (Updated 2026-09-15)
Parse → Classify → Score → Select → Execute → Stream.
Observability hooks at each stage (plan 08).
Policy enforcement pre/post/streaming (plan 13).
Token optimization (plan 26).

## Rules Engine (New — 2026-09-15)
Declarative rules in `src/lib/rules/`. Compiled evaluation with trace.
First-match precedence. Analytics in `rule_analytics` table.
```

**Acceptance criteria:** ARCHITECTURE.md reflects current state; no stale sections.

### M2 — User guides

**Reference code (`docs/guides/` structure):**

```markdown
docs/guides/
├── getting-started.md          # Install → configure → first request
├── provider-setup.md           # Per-provider setup walkthrough
├── combo-config.md             # Combo builder + strategies explained
├── smart-router.md             # Smart router setup + tuning
├── oauth-setup.md              # OAuth credential flow guide
├── multi-account.md            # Multi-account rotation + quota
├── troubleshooting.md          # Common errors + fixes
└── migration-from-other.md     # Migrate from LiteLLM/OpenRouter
```

**Acceptance criteria:** core guides written; link-checked; consistent format.

### M3 — Auto-generated docs + provider docs

**Reference code (`scripts/gen-api-docs.mjs`):**

```js
// Generate API docs from route files.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function genApiDocs() {
  const routes = [];
  const dir = "src/app/api/v1";
  for (const [section, files] of walkRoutes(dir)) {
    for (const [path, content] of Object.entries(files)) {
      const methods = extractMethods(content);
      routes.push({ section, path, methods });
    }
  }
  return routes; // Write to docs/api-reference.md
}
```

**Reference code (`scripts/check-doc-freshness.mjs`):**

```js
// Check docs are newer than source files they reference.
import { statSync } from "node:fs";

export function checkDocFreshness(docPath, sourceFiles) {
  const docTime = statSync(docPath).mtimeMs;
  const stale = sourceFiles.filter((f) => statSync(f).mtimeMs > docTime);
  if (stale.length) {
    console.warn(`[docs] ${docPath} is stale — sources changed: ${stale.join(", ")}`);
  }
  return stale.length === 0;
}
```

**Acceptance criteria:** auto-generated API docs; freshness check in CI.

### M4 — ADRs + glossary + CI

**Reference code (`.github/workflows/ci.yml` step):**

```yaml
      - run: node scripts/check-doc-freshness.mjs
```

**Files touched:** glossary updates, ADR templates in `docs/`.

**Acceptance criteria:** glossary current; freshness check in CI; ADRs for major decisions.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Doc drift | Freshness check in CI |
| Over-documentation | Focus on what changes |
| Stale guides | Link-check in CI |

## Verification

- CI: doc freshness check
- Manual: build docs; review ARCHITECTURE.md
- Link check: all internal links resolve