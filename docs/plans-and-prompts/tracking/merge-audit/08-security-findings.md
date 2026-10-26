# 08 — Security Findings (v5-vscode-works)

**Branch**: `v5-vscode-works`
**Date**: 2026-10-26
**Host probed**: mini4:20129 (PID 49092, commit 5a62a892)
**Finder**: code review triggered by operator's mini2 probe session + vision-subagent security flags

---

## Finding #1 — CRITICAL: Unauthenticated remote shutdown via `/api/version/shutdown`

### Severity
**CRITICAL** — any network peer can kill the server with a single unauthenticated POST.

### Root cause
`src/app/api/version/shutdown/route.js` has no authentication gate:

```js
export async function POST() {
  try { await killAppProcesses(); } catch { /* best effort */ }
  const response = NextResponse.json({ success: true, message: "Shutting down for manual update..." });
  setTimeout(() => process.exit(0), 500);
  return response;
}
```

### Contrast with sibling routes
| Route | Auth gate | Status |
|---|---|---|
| `/api/shutdown` | JWT `auth_token` OR `x-9r-cli-token` + optional `SHUTDOWN_SECRET` + dev-only guard | ✅ Properly gated |
| `/api/version/update` | JWT OR CLI token + optional `UPDATE_SECRET` + timing-safe compare | ✅ Properly gated |
| `/api/version/shutdown` | **NONE** | 🔴 Wide open |

### Attack chain
```
curl -X POST http://<host>:20129/api/version/shutdown
→ 200 {"success":true}
→ server process exits 500ms later
```

Any LAN peer, any unauthenticated internet client if exposed, can DoS the proxy. The `killAppProcesses()` call also tears down cloudflared tunnels and MITM sidecars before exit, so the blast radius extends beyond the Next.js process itself.

### Proof
Operator probed `GET /api/version/shutdown` (should be 405), OPTIONS, and unauthed POST on mini4:20129 and mini2:20128 on 2026-10-26. Code review of `src/app/api/version/shutdown/route.js` confirms the route accepts any POST with no auth, no method restriction, no CSRF, no rate-limit differentiation.

### Fix
Mirror the `/api/shutdown` auth pattern:
- Require `x-9r-cli-token` (timing-safe) OR `auth_token` JWT
- Optional `SHUTDOWN_SECRET` second factor when env var set
- Reject in production builds if we want dev-only behavior (match `/api/shutdown`'s stance)
- Add explicit method guard so GET returns 405

---

## Finding #2 — HIGH: IDOR on `/api/keys/[id]` leaks raw API keys + ownerless mutation

### Severity
**HIGH** — these keys are exactly what 9Router exists to protect. An authenticated peer (any LAN user when `requireLogin=false`, any SSO user in multi-tenant deployments) can steal any key on the system by UUID, and can toggle/rename/revoke any key.

### Root cause
`src/app/api/keys/route.js` (list) correctly masks the `key` field:

```js
function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "\u2022".repeat(fullKey.length - 10) + fullKey.slice(-4);
}
// GET /api/keys
const maskedKeys = keys.map(k => ({ ...k, key: maskKey(k.key) }));
```

But `src/app/api/keys/[id]/route.js` (single-key) returns the raw key:

```js
export async function GET(request, { params }) {
  const { id } = await params;
  const key = await getApiKeyById(id);
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ key });  // ← raw key, no masking
}
```

PUT and DELETE on the same route have no owner check — they accept any authenticated session and operate on whatever UUID was in the URL.

### Attack chain
1. `GET /api/keys` → response includes full UUIDs (`b0c998da-e0a4-498d-a266-c81284c62f7e`); only the `key` field is masked.
2. `GET /api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e` → response includes `"key": "sk-cb9c2fba45e06923-d3yviq-12f51a0b"` (full, unmasked).
3. Attacker now has the credential 9Router was protecting.

UUID secrecy is not a security boundary here because step 1 hands them out freely.

### Proof (live on mini4:20129, PID 49092, 2026-10-26)
```
$ curl -b cookie http://127.0.0.1:20129/api/keys
{"keys":[{"id":"b0c998da-e0a4-498d-a266-c81284c62f7e","key":"sk-cb9••••••••••••••••••••••••1a0b", ...}]}

$ curl -b cookie http://127.0.0.1:20129/api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e
{"key":{"id":"b0c998da-...","key":"sk-cb9c2fba45e06923-d3yviq-12f51a0b", ...}}
```

Full key material exposed to any authenticated caller.

### Fix (Option A — minimal, backward-compat)
- Apply the same `maskKey()` to `GET /api/keys/[id]`
- Add `requireAuth` gate at top of PUT/DELETE to reject non-browser/non-session requests
- Dashboard continues to work because it receives the full key from `POST /api/keys` on creation and holds it in memory for the reveal/copy flow

### Fix (Option B — proper, follow-up)
- All of Option A, plus
- Scope every key operation to the current session's keys (owner-based access control)
- Add `POST /api/keys/[id]/reveal` with one-time token for the dashboard's copy-to-clipboard flow
- Audit other `[id]` routes (`/api/providers/[id]`, `/api/combos/[id]`, `/api/hooks/[id]`, `/api/messages/[id]`, `/api/skills/[id]`, `/api/proxy-pools/[id]`) for the same pattern

---

## Finding #3 — INFORMATIONAL: `dns` icon for Providers sidebar nav

Flagged by vision subagent (pre-fix). Cosmetic, not security. Deferred to follow-up UI polish PR.

## Finding #4 — INFORMATIONAL: Marketing links in admin sidebar

`9Remote HOT` (https://9remote.cc) and `9English` (https://9english.net/) in the admin sidebar. External promo links mixed into a security-sensitive console. Operator decision needed: keep, gate on `isRemoteHost`, or remove.

## Finding #5 — INFORMATIONAL: Path disclosure on profile page

`~/.9router/db/data.sqlite` rendered in the UI. Harmless on a single-tenant personal install, small information-disclosure on shared deployments.

---

## Remediation status

| # | Severity | Status |
|---|---|---|
| 1 | CRITICAL | Fix in flight — auth gate mirroring `/api/shutdown` |
| 2 | HIGH | Fix in flight — mask single-GET + auth gate on PUT/DELETE |
| 3 | INFO | Deferred (UI polish PR) |
| 4 | INFO | Awaiting operator decision |
| 5 | INFO | Deferred (UI polish PR) |

## Evidence chain
- Code review of `src/app/api/version/shutdown/route.js` (15 lines, no auth)
- Code review of `src/app/api/keys/[id]/route.js` (raw key return, no owner check)
- Code review of `src/app/api/keys/route.js` (masked list confirms maskKey helper exists)
- Code review of `src/app/api/shutdown/route.js` and `src/app/api/version/update/route.js` (the proper pattern to mirror)
- Live curl probe on mini4:20129 PID 49092 confirming IDOR
- mini2 status check 2026-10-26 00:54 MDT: launchd watchdog `com.9router.app` respawned PID 14934 (next-server v16.3.5) on :20128 after the earlier transient outage
