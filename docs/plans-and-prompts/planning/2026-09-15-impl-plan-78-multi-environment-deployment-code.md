# Implementation Plan 78 — Multi-Environment Deployment — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #environments #deployment #promotion #isolation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (Docker deployment from plan 41; env contract in `.env.example`; CLI launcher in `cli/`; CI from plan 32; migration/backup from plan 39).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — switch environments; confirm separate DBs/configs; run promotion dry-run.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-78-multi-environment-deployment.md`, `../research/9router/impl-plan-41-docker-deployment.md`, `../research/9router/impl-plan-32-ci-cd.md`.

## Scope

**In scope:** environment model (dev, staging, production) with per-environment config overrides and separate data stores; promotion workflow (dev → staging → prod) with gates (tests, approval) and per-stage rollback; isolation (config, data, network/ports); CLI environment switching; dashboard environment indicator; DEPLOYMENT docs.
**Out of scope:** cloud provider-specific deployment automation (Docker-first); secrets management integration beyond env files.

## Milestones

### M1 — Environment model + config isolation

**Reference code (`src/lib/environments/index.js`):**

```js
export const ENVIRONMENTS = ["dev", "staging", "production"];

// Resolve current environment: NODE_ENV / APP_ENV / default dev.
export function currentEnvironment(env = process.env) {
  const raw = env.APP_ENV ?? env.NODE_ENV ?? "dev";
  return ENVIRONMENTS.includes(raw) ? raw : "dev";
}

// Per-environment overrides merged over base config.
export function envOverrides(envName, overrides = {}) {
  return overrides[envName] ?? {};
}

// Data isolation: separate DB file per environment.
export function dbPathFor(envName, baseDir) {
  return `${baseDir}/9router-${envName}.db`;
}

// Network isolation: distinct default ports.
export const DEFAULT_PORTS = { dev: 20127, staging: 20128, production: 20129 };
export function portFor(envName, env = process.env) {
  return Number(env.PORT ?? DEFAULT_PORTS[envName] ?? 20128);
}
```

**Acceptance criteria:** environment resolved; overrides applied; DB/port isolated per env.

### M2 — Promotion workflow

**Reference code (`scripts/promote.mjs`):**

```js
#!/usr/bin/env node
// Promotion: dev → staging → production with gates.
import { execSync } from "node:child_process";

const STAGES = ["dev", "staging", "production"];
const [from, to] = process.argv.slice(2);

if (!STAGES.includes(from) || !STAGES.includes(to) || STAGES.indexOf(to) <= STAGES.indexOf(from)) {
  console.error("Usage: node scripts/promote.mjs <from> <to>  (from must precede to)");
  process.exit(1);
}

// Gate 1: tests must pass.
try {
  execSync("npx vitest run", { cwd: "tests", stdio: "inherit" });
} catch {
  console.error("Promotion blocked: tests failed");
  process.exit(1);
}

// Gate 2: build must succeed.
try {
  execSync("npm run build", { stdio: "inherit" });
} catch {
  console.error("Promotion blocked: build failed");
  process.exit(1);
}

// Gate 3: approval (interactive) — set PROMOTE_APPROVED=1 to skip.
if (process.env.PROMOTE_APPROVED !== "1") {
  console.error("Promotion blocked: approval required (PROMOTE_APPROVED=1 to approve)");
  process.exit(1);
}

console.log(`Promoting ${from} → ${to}: gates passed`);
```

**Acceptance criteria:** stage order enforced; test/build gates; approval gate; rollback documented.

### M3 — Rollback

**Reference code (`scripts/rollback.mjs`):**

```js
#!/usr/bin/env node
// Per-stage rollback: restore previous release artifact.
import { execSync } from "node:child_process";

const [stage] = process.argv.slice(2);
const STAGES = ["dev", "staging", "production"];
if (!STAGES.includes(stage)) { console.error("Usage: node scripts/rollback.mjs <stage>"); process.exit(1); }

// Tag-based rollback: previous release tag for the stage.
try {
  const prev = execSync(`git describe --tags --abbrev=0 --match "${stage}-*" HEAD~1`).toString().trim();
  console.log(`Rolling back ${stage} to ${prev}`);
  execSync(`git checkout ${prev} -- .`, { stdio: "inherit" });
  console.log("Rollback complete — rebuild and redeploy the stage");
} catch (e) {
  console.error("Rollback failed:", e.message);
  process.exit(1);
}
```

**Acceptance criteria:** rollback targets previous stage tag; failure handled.

### M4 — CLI switching + docs + tests

**Reference code (`src/lib/environments/cli.js`):**

```js
// CLI helper used by cli/ launcher: switch environment by writing APP_ENV.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function switchEnvironment(envName, { envFile = ".env" } = {}) {
  const path = join(process.cwd(), envFile);
  const existing = readFileSync(path, "utf8").replace(/^APP_ENV=.*$/m, "").trim();
  writeFileSync(path, `${existing}\nAPP_ENV=${envName}\n`);
  return { ok: true, envName, envFile: path };
}
```

**Files touched:** `src/lib/environments/` (new), `.env.dev` / `.env.staging` / `.env.prod` (new), `scripts/promote.mjs` (new), `scripts/rollback.mjs` (new), `cli/src/` (environment switching), `docs/DEPLOYMENT.md` (new), `tests/unit/environments.test.js` (new).

**Acceptance criteria:** CLI switches env; promotion/rollback scripts work; docs complete.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Env confusion | Wrong env used | Clear naming + indicator |
| Promotion breakage | Bad release | Gates (tests/build/approval) |
| Data leaks | Cross-env data | Separate DBs + ports |
| Complexity | Ops burden | Progressive (dev/staging first) |

## Verification

- Unit: currentEnvironment, dbPathFor, portFor
- Manual: switch env → separate DB created; promote with gates; rollback restores tag
- Regression: `tests/__baseline__/verify-no-regression.mjs`