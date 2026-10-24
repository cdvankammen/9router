# Implementation Plan 62 — Data Export & Import — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #data-export #import #portability #migration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/db/` SQLite layer; `src/lib/usageDb.js` usage.json; backup/restore from plan 39 (`src/lib/backup/`); config export from plan 42; `API_KEY_SECRET` encryption for credentials; `cli/` package for CLI export).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — export all scopes; import into a fresh instance; confirm validation + backup-first.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-62-data-export-import.md`, `../research/9router/impl-plan-39-migration-backup-restore.md`, `../research/9router/impl-plan-42-config-system-overhaul.md`.

## Scope

**In scope:** export scopes (config, usage, credentials-encrypted, all); formats (JSON config, CSV usage); export metadata (version, timestamp, checksum); import validation (schema check before write); import modes (merge, replace); backup-before-import; instance migration (export → import with version compatibility); API + dashboard + CLI export.
**Out of scope:** cloud sync (separate feature); incremental sync.

## Milestones

### M1 — Export

**Reference code (`src/lib/portable/export.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { createHash } from "node:crypto";

// Export scopes: config | usage | credentials | all.
export async function exportData({ scope = "all", encrypt = (v) => v } = {}) {
  const db = getAdapter();
  const out = { version: 1, exportedAt: new Date().toISOString(), scope, data: {} };

  if (scope === "config" || scope === "all") {
    out.data.config = db.all("SELECT * FROM settings");
  }
  if (scope === "usage" || scope === "all") {
    out.data.usage = db.all("SELECT * FROM usage ORDER BY id");
  }
  if (scope === "credentials" || scope === "all") {
    // Credentials exported encrypted (API_KEY_SECRET-based).
    const creds = db.all("SELECT * FROM credentials");
    out.data.credentials = creds.map((c) => ({ ...c, apiKey: encrypt(c.apiKey) }));
  }

  // Metadata: checksum for integrity.
  const payload = JSON.stringify(out.data);
  out.checksum = createHash("sha256").update(payload).digest("hex");
  return out;
}

// CSV export for usage.
export function usageToCsv(rows) {
  const header = ["ts", "model", "provider", "user_id", "prompt_tokens", "completion_tokens", "cost", "latency_ms", "ok"];
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map((h) => `"${String(r[h] ?? "")}"`).join(","));
  return lines.join("\n");
}
```

**Acceptance criteria:** all scopes export; credentials encrypted; checksum present; CSV valid.

### M2 — Import with validation

**Reference code (`src/lib/portable/import.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { createHash } from "node:crypto";

// Validate before import: version, checksum, schema.
export function validateImport(payload) {
  const errors = [];
  if (payload.version !== 1) errors.push(`unsupported version: ${payload.version}`);
  const checksum = createHash("sha256").update(JSON.stringify(payload.data)).digest("hex");
  if (payload.checksum && checksum !== payload.checksum) errors.push("checksum mismatch — data may be corrupted");
  if (!payload.data || typeof payload.data !== "object") errors.push("missing data section");
  if (payload.data.config && !Array.isArray(payload.data.config)) errors.push("config must be an array");
  return { ok: errors.length === 0, errors };
}

// Import modes: merge (upsert) | replace (wipe + insert).
export async function importData(payload, { mode = "merge", decrypt = (v) => v } = {}) {
  const validation = validateImport(payload);
  if (!validation.ok) throw Object.assign(new Error("Import validation failed"), { details: validation.errors });

  const db = getAdapter();
  // Safety: backup before import (plan 39).
  const { createBackup } = await import("@/lib/backup/backup.js");
  await createBackup({ label: "pre-import" });

  if (mode === "replace") {
    db.exec("DELETE FROM settings");
    db.exec("DELETE FROM usage");
    db.exec("DELETE FROM credentials");
  }

  let imported = 0;
  if (payload.data.config) {
    for (const row of payload.data.config) {
      db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [row.key, row.value]);
      imported++;
    }
  }
  if (payload.data.credentials) {
    for (const row of payload.data.credentials) {
      db.run("INSERT INTO credentials (id, provider, label, api_key) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key",
        [row.id, row.provider, row.label, decrypt(row.apiKey)]);
      imported++;
    }
  }
  return { imported, mode };
}
```

**Acceptance criteria:** validation blocks bad payloads; backup created before import; merge/replace both work.

### M3 — Instance migration

**Reference code (`src/lib/portable/migrate.js`):**

```js
// Migration between instances: export from source, import to target.
export async function migrateInstance({ sourceUrl, targetUrl, scope = "all", apiKey }) {
  // 1. Export from source.
  const res = await fetch(`${sourceUrl}/api/v1/export?scope=${scope}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`export failed: ${res.status}`);
  const payload = await res.json();

  // 2. Version compatibility check.
  const srcVersion = payload.version;
  const targetRes = await fetch(`${targetUrl}/api/v1/export?scope=config`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const targetMeta = await targetRes.json();
  if (srcVersion > targetMeta.version) {
    throw new Error(`source export v${srcVersion} newer than target v${targetMeta.version} — upgrade target first`);
  }

  // 3. Import to target.
  const importRes = await fetch(`${targetUrl}/api/v1/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ payload, mode: "merge" }),
  });
  if (!importRes.ok) throw new Error(`import failed: ${importRes.status}`);
  return importRes.json();
}
```

**Acceptance criteria:** migration flow works; version compatibility enforced; documented in docs.

### M4 — API + dashboard + CLI + tests

**Reference code (`src/app/api/v1/export/route.js`):**

```js
import { exportData, usageToCsv } from "@/lib/portable/export.js";

export async function GET(req) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const format = url.searchParams.get("format") ?? "json";
  const data = await exportData({ scope });
  if (format === "csv" && scope === "usage") {
    return new Response(usageToCsv(data.data.usage), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=usage.csv" },
    });
  }
  return Response.json(data);
}
```

**Files touched:** `src/lib/portable/` (new: export, import, migrate), `src/app/api/v1/export/route.js` (new), `src/app/api/v1/import/route.js` (new), dashboard export page (new), `cli/src/` (CLI export command), `tests/unit/export-import.test.js` (new).

**Acceptance criteria:** API works; dashboard buttons functional; CLI command exists; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Import corruption | Broken instance | Validation + backup-first |
| Credential leakage | Exposed keys | Encrypted export + decrypt on import |
| Version mismatch | Incompatible data | Compatibility checks |
| Data loss | Wipe on replace | Backup + confirm |

## Verification

- Unit: export, validate, import, migrate
- Manual: export → fresh instance import → verify
- Regression: `tests/__baseline__/verify-no-regression.mjs`