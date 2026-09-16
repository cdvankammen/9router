# Implementation Plan 25 — Cloud Sync & Multi-Device — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cloud-sync #multi-device #conflict-resolution #encryption #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, existing cloud sync code in `src/lib/` (cloud sync exists per ARCHITECTURE.md), `src/lib/db/repos/settingsRepo.js` cloudEnabled, `src/app/api/v1/` conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, sync between two devices, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-25-cloud-sync-multidevice.md`, `../research/9router/40-cloud-sync.md`

## Scope

**In scope:** sync units (config, credentials encrypted, usage, logs); triggers (change-based debounced, interval, manual); conflict resolution per-unit (config: field-level LWW merge; credentials: newest wins; usage: additive); conflict log; E2E encryption; device auth rotation; sync telemetry.
**Out of scope:** server-side sync infrastructure (existing cloud service); real-time collaboration.

## Milestones

### M1 — Sync units + triggers

**Reference code (`src/lib/sync/units.js`):**

```js
// Sync units: what gets synced and how.
export const SYNC_UNITS = {
  config: { encrypt: false, conflict: "field-lww" },
  credentials: { encrypt: true, conflict: "newest-wins" },
  usage: { encrypt: false, conflict: "additive" },
  logs: { encrypt: false, conflict: "additive" },
};

// Change-based trigger: debounce 5s after local change.
export function debouncedSync(fn, { delayMs = 5000 } = {}) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// Interval trigger: every N minutes.
export function intervalSync(fn, { intervalMs = 15 * 60_000 } = {}) {
  return setInterval(fn, intervalMs);
}
```

**Acceptance criteria:** units defined; debounced + interval + manual triggers.

### M2 — Conflict resolution

**Reference code (`src/lib/sync/conflicts.js`):**

```js
// Field-level LWW merge for config.
export function mergeConfig(local, remote, { now = Date.now() } = {}) {
  const merged = { ...local };
  for (const [key, rv] of Object.entries(remote)) {
    const lv = local[key];
    if (lv === undefined) { merged[key] = rv; continue; }
    const lts = local[`${key}_ts`] ?? 0;
    const rts = remote[`${key}_ts`] ?? 0;
    if (rts > lts) merged[key] = rv;
  }
  return merged;
}

// Newest wins for credentials (whole record).
export function mergeCredentials(local, remote) {
  return (remote.updated_at ?? 0) >= (local.updated_at ?? 0) ? remote : local;
}

// Additive for usage/logs (union, dedupe by id).
export function mergeAdditive(local, remote) {
  const seen = new Set(local.map((x) => x.id));
  const merged = [...local];
  for (const item of remote) {
    if (!seen.has(item.id)) { merged.push(item); seen.add(item.id); }
  }
  return merged;
}

// Conflict log entry.
export function logConflict(db, { unit, key, local, remote, resolution }) {
  return db.run(`
    INSERT INTO sync_conflicts (id, unit, key, local, remote, resolution, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [crypto.randomUUID(), unit, key, JSON.stringify(local), JSON.stringify(remote), resolution, Date.now()]);
}
```

**Acceptance criteria:** per-unit resolution; conflict log; no data loss.

### M3 — E2E encryption + device auth

**Reference code (`src/lib/sync/encryption.js`):**

```js
// E2E: encrypt credentials with device key before upload.
export function encryptPayload(payload, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(payload));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc).then((cipher) => ({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(cipher)),
  }));
}

export async function decryptPayload(payload, key) {
  const iv = new Uint8Array(payload.iv);
  const data = new Uint8Array(payload.data);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

// Device auth rotation: re-encrypt all credentials with new device key.
export async function rotateDeviceKey(oldKey, newKey, credentials) {
  const out = [];
  for (const cred of credentials) {
    const plain = await decryptPayload(cred.encrypted, oldKey);
    out.push({ ...cred, encrypted: await encryptPayload(plain, newKey) });
  }
  return out;
}
```

**Acceptance criteria:** credentials encrypted E2E; rotation re-encrypts; keys never leave device.

### M4 — Sync service + API + tests

**Reference code (`src/lib/sync/service.js`):**

```js
export async function syncNow({ units = Object.keys(SYNC_UNITS), direction = "both" } = {}) {
  const results = {};
  for (const unit of units) {
    const local = await collectLocal(unit);
    const remote = await fetchRemote(unit);
    const merged = resolveUnit(unit, local, remote);
    if (direction !== "pull") await pushRemote(unit, merged);
    if (direction !== "push") await applyLocal(unit, merged);
    results[unit] = { local: local.length, remote: remote.length, merged: merged.length };
  }
  return results;
}
```

**Files touched:** `src/app/api/v1/sync/route.js` (status + trigger), dashboard sync page, `tests/unit/sync.test.js` (new).

**Acceptance criteria:** sync works both directions; telemetry recorded; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Existing cloud service API | Version drift | Adapter layer |
| Encryption key loss | Key backup + recovery |
| Conflict storms | Debounce + per-unit resolution |
| Usage additive growth | Dedupe by id |

## Verification

- Unit: merges, encryption, rotation
- Manual: two devices → change config on both → verify merge + conflict log
- Regression: `tests/__baseline__/verify-no-regression.mjs`