# Deployment Proof — Build `wwfFNDqw67CA2YCBfE_DK` (d2f522a1)

**Date**: 2026-10-26
**Branch**: `v5-vscode-works` @ `d2f522a1`
**Origin delta**: 0 behind / 301 ahead
**Local BUILD_ID**: `wwfFNDqw67CA2YCBfE_DK`

## Deployed Hosts

| Host | IP | Port | PID | BUILD_ID (standalone) | Binding |
|------|-----|------|-----|----------------------|----------|
| mini4 (Mac.lan) | 192.168.1.189 / 100.76.147.49 | 20129 | 95872 | `wwfFNDqw67CA2YCBfE_DK` | `*:20129` |
| mini2 (real) | 100.96.109.61 | 20128 | 79639 | `wwfFNDqw67CA2YCBfE_DK` | `*:20128` |

### BUILD_ID verification commands
```bash
# mini4
ssh chris@192.168.1.189 'cat ~/9router-build/.next/standalone/.next/BUILD_ID'
# → wwfFNDqw67CA2YCBfE_DK

# mini2
ssh chris@100.96.109.61 'cat /Applications/9Router.app/Contents/Resources/app/app/.next/standalone/.next/BUILD_ID'
# → wwfFNDqw67CA2YCBfE_DK
```

## 14-Gate requireAuth Matrix (all return 401 unauthenticated)

All probes use fabricated UUID `00000000-0000-0000-0000-000000000000`, no auth cookie, no CLI token.

| # | Method | Endpoint | mini4 | mini2 |
|---|--------|----------|-------|-------|
| 1 | PUT | `/api/providers/{id}` | 401 | 401 |
| 2 | DELETE | `/api/providers/{id}` | 401 | 401 |
| 3 | PUT | `/api/combos/{id}` | 401 | 401 |
| 4 | DELETE | `/api/combos/{id}` | 401 | 401 |
| 5 | PUT | `/api/proxy-pools/{id}` | 401 | 401 |
| 6 | DELETE | `/api/proxy-pools/{id}` | 401 | 401 |
| 7 | POST | `/api/hooks` | 401 | 401 |
| 8 | POST | `/api/providers/test-batch` | 401 | 401 |
| 9 | POST | `/api/messages/{id}/annotations` | 401 | 401 |
| 10 | DELETE | `/api/messages/{id}/annotations` | 401 | 401 |
| 11 | PATCH | `/api/messages/{id}/annotations` | 401 | 401 |
| 12 | POST | `/api/providers/{id}/test` | 401 | 401 |
| 13 | PUT | `/api/providers/openai/overrides` | 401 | 401 |
| 14 | DELETE | `/api/provider-nodes/{id}` | 401 | 401 |

## Relay Header Fix Verification

The relay `rawHeaders` lossless-forwarding fix (commits 928517ad + d2f522a1) is confirmed present in the compiled build:

```bash
grep -c rawHeaders .next/standalone/.next/server/app/api/proxy-pools/vercel-deploy/route.js
# → 6
```

This replaces the broken `new Headers(req.headers)` pattern from commit 2b63e0dd that lost non-standard headers in relay pools.

## Security Hardening Summary (this build)

1. **Middleware promotion** (24f497b6): `ALWAYS_PROTECTED` routes require JWT regardless of `requireLogin` setting
2. **Route-level requireAuth** (1ebed4fc, 27ff0cfa, f7a641d3): 13 additional routes gated with `requireAuth()` helper
3. **Timing-safe CLI token** (f7a641d3): `crypto.timingSafeEqual` replaces `===` for CLI machine-id comparison
4. **Web-cookie hardening** (ac1784f3): `mkdirSync mode:0o700` + `removeWebLoginProfile()` on connection delete
5. **OAuth callback bind** (ae6c045b): All `server.listen()` bind to `127.0.0.1`
6. **Relay headers** (928517ad, d2f522a1): `rawHeaders` pattern restored for lossless forwarding
7. **15 negative sentinel tests** (08d4b10e): All pass, proving every gate rejects unauthenticated requests

## Test Suite

```
npx vitest run → 4209 passed, 54 failed (baseline: 56 known failures)
```
No regressions vs baseline.
