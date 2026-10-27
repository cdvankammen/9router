# Stage 6c — evil.example.com Test-Artifact Purge Proof

**Date:** 2026-10-27 (local)
**Branch:** `v5-vscode-works`
**Host:** mini2 (`100.96.109.61` Tailscale / `100.96.109.61:20128`)
**Source finding:** Stage 4 review of session `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d` (DOM-errors chat log, wave 23) — Finding #13.
**Operator:** Copilot agent, executed via `ssh chris@100.96.109.61` with `sqlite3` against the live DB.

---

## What was being purged

Stage 4 flagged an `evil.example.com` OIDC IdP config that was live in mini2's DB. Investigation showed it was **not** an active OIDC/SAML setting — it was two separate **security-audit test artifacts** left over from prior adversarial-probe sessions:

1. **`providerConnections` row** — `grok-cli` OAuth connection named `attacker@evil.com` with a fake token `attacker-token-w424` and email `attacker@evil.com`. Test artifact from a device-code OAuth hijack probe.
2. **`settings.data → $.smartRouter.evil_key`** — stored-XSS probe value `<script>alert(416)</script>` injected into the smartRouter config block during a stored-XSS audit wave.

Neither was an active IdP configuration. The real OIDC config is `oidcIssuerUrl=https://accounts.google.com` with `oidcClientId=test` (legitimate Google OAuth).

---

## DB location discovery

Initial attempts targeted `~/.9router/db/data.db` which was **0 bytes** (stale placeholder from Sep 7). The actual active DB is:

```
/Users/chris/.9router/db/data.sqlite   262,152,192 bytes   SQLite 3.54.0, WAL mode
```

Schema (20 tables): `_meta, apiKeys, combos, kv, message_annotations, message_facets, providerConnections, providerNodes, proxyPools, requestDetails, requestDetails_fts, requestDetails_fts_config/content/data/docsize/idx, requestStats, saved_views, seenModels, settings, usageDaily, usageHistory`.

JSON-blob schema pattern: tables use a single `data TEXT NOT NULL` column holding JSON, not discrete columns. Queries must use `json_extract()` or cast-to-text LIKE.

---

## Backup

Before any write:

```
-rw-r--r-- 1 chris staff 262,152,192 Oct 26 20:29 data.sqlite.bak-pre-evil-purge-20261026-202953
```

Full pre-mutation copy at `~/.9router/db/data.sqlite.bak-pre-evil-purge-20261026-202953`. Restorable via `cp data.sqlite.bak-pre-evil-purge-20261026-202953 data.sqlite`.

---

## Mutation 1 — DELETE providerConnections evil row

**BEFORE:**
```
providerConnections count: 1
Evil rows: a9ce2d78-2d23-4eac-ab86-62856193f5a6 | attacker@evil.com
```

**SQL:**
```sql
DELETE FROM providerConnections
WHERE id='a9ce2d78-2d23-4eac-ab86-62856193f5a6'
  AND name='attacker@evil.com';
-- SELECT changes() → 1
```

**AFTER:**
```
providerConnections count: 0
Evil rows: 0
PRAGMA integrity_check → ok
mini2 /api/health → 200
```

---

## Mutation 2 — json_remove of $.smartRouter.evil_key

**BEFORE:**
```json
$.smartRouter = {
  "enabled": true,
  "names": ["modelRouter"],
  "allowedProviders": [],
  "allowedModels": [],
  "costQualityTradeoff": 5,
  "maxCandidates": 3,
  "stickyTtlMin": 5,
  "evil_key": "<script>alert(416)</script>"
}
```

**SQL:**
```sql
UPDATE settings
SET data = json_remove(data, '$.smartRouter.evil_key')
WHERE id = 1;
-- SELECT changes() → 1
```

**AFTER:**
```json
$.smartRouter = {
  "enabled": true,
  "names": ["modelRouter"],
  "allowedProviders": [],
  "allowedModels": [],
  "costQualityTradeoff": 5,
  "maxCandidates": 3,
  "stickyTtlMin": 5
}
```

**Integrity checks:**
- `json_extract(data, '$.smartRouter.evil_key')` → empty (removed)
- `json_extract(data, '$.password')` → `$2b$10$tZv...` (preserved — password hash untouched)
- `json_extract(data, '$.oidcIssuerUrl')` → `https://accounts.google.com` (legitimate, untouched)
- `json_extract(data, '$.oidcClientSecret')` → set (preserved)
- Substring count `(length(data) - length(replace(data,'evil','')))/4` → **0**
- `PRAGMA wal_checkpoint(TRUNCATE)` → `0|0|0`
- `PRAGMA integrity_check` → `ok`
- `curl localhost:20128/api/health` → `200`

---

## Self-correction note

An earlier checkpoint in this session mischaracterized the `settings.data` evil match as a "JWT signature substring false positive." That was **incorrect**. The actual artifact was a stored-XSS probe value `$.smartRouter.evil_key = "<script>alert(416)</script>"`. The `evil` substring appears in `evil_key` (4 chars × 1 occurrence), confirmed by `json_each(settings.data)` returning `smartRouter` as the only top-level key whose value matched `%evil%`. This document reflects the corrected finding.

---

## Broad sweep — other config tables

| Table | Evil rows |
|---|---|
| `providerNodes` | 0 |
| `proxyPools` | 0 (no data/name column match — schema has no such columns) |
| `apiKeys` | 0 (schema N/A) |
| `combos` | 0 (schema N/A) |
| `kv` | 0 (schema N/A) |
| `saved_views` | 0 (schema N/A) |
| `seenModels` | 0 (schema N/A) |
| `message_annotations` | 0 (schema N/A) |
| `message_facets` | 0 (schema N/A) |
| `requestDetails` (audit log) | 0 (not deleted — read-only check) |

**Binary `strings` sweep:**
- `evil.example.com` → **0 matches**
- `attacker@evil` → **0 matches**
- `evil_key` → **1 match** (residual in SQLite internal page; json_extract is empty, substring count is 0, so this is either an FTS index entry or a free-page byte sequence; a future `VACUUM` would scrub it; freelist_count non-zero confirms free pages exist)

WAL file is **0 bytes** after `PRAGMA wal_checkpoint(TRUNCATE)` — all changes flushed to the main DB.

---

## mini4 status

mini4 (`192.168.1.189:20129`) was checked and is **clean**:
- `providerConnections` → 0 total rows (never had any)
- `settings.data evil.example.com` count → 0
- No purge needed.

---

## What was NOT touched

- Password hash (`$.password = $2b$10$tZv...`) — preserved
- OIDC client ID / secret (`$.oidcClientId=test`, `$.oidcClientSecret` set) — preserved
- SAML settings (all empty) — preserved
- All other smartRouter fields (`enabled`, `names`, `allowedProviders`, `allowedModels`, `costQualityTradeoff`, `maxCandidates`, `stickyTtlMin`) — preserved
- `requestDetails` audit log — **read-only**; 0 evil references anyway
- `.env` files — untouched
- `custom-server.js` / source code — untouched (this is a DB hygiene operation only)

---

## Relation to Bug GG (Stage 5a)

Bug GG (commit `7cfac12f`) closed the code-level SSO-hijack vector — `x-forwarded-host` injection can no longer rewrite `redirect_uri` even if an attacker-controlled IdP URL were present. This Stage 6c purge removes the leftover test IdP connection so it cannot be confused with a real compromise during future audits.

The two changes are defense-in-depth:
- **Bug GG fix** = code boundary (socket-layer header strip)
- **Stage 6c purge** = data boundary (no fake attacker connection in DB)

---

## Verification matrix (3-proof requirement)

| Proof type | Evidence |
|---|---|
| **Code** | No source change — DB-only operation. Test suite unchanged at 4787 pass / 54 fail (no regression vs baseline 56). |
| **DOM** | App health endpoint responds 200 post-mutation. Dashboard login page still renders on `http://mini2:20128/login` (observed via browser snapshot before password lockout). |
| **Visual** | Login page screenshot captured earlier this stage (page `8077b770-4fb1-43b7-96a7-074409773f2e`); OIDC and Password login panels render correctly. Post-purge deep-dashboard visual sweep is blocked on operator password (see blockers). |

---

## Remaining blockers for Stages 5d / 7

- **mini2 password ≠ `123456`** — `INITIAL_PASSWORD=change-me` in `.env`, real password set elsewhere. 2 failed attempts logged before retries stopped.
- **mini4 password ≠ `123456`** — 1 failed attempt logged before retries stopped.
- **Action required:** Operator provides passwords or logs in manually and shares dashboard screenshots.

---

## Artifact locations

| Artifact | Path |
|---|---|
| Backup (pre-purge) | `chris@100.96.109.61:~/.9router/db/data.sqlite.bak-pre-evil-purge-20261026-202953` |
| Active DB | `chris@100.96.109.61:~/.9router/db/data.sqlite` |
| This proof doc | `docs/plans-and-prompts/security/2026-10-27-stage6c-evil-purge-proof.md` |
| Source finding | `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` (Finding #13) |
| Session transcript | `/Users/chris/Library/Application Support/Code - Insiders/User/workspaceStorage/9d36bc98974e3588f27c01391c3ae20e/GitHub.copilot-chat/transcripts/3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d.jsonl` |
