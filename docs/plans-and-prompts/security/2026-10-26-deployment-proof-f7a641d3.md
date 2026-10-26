# Deployment Proof — f7a641d3 + 08d4b10e (2026-10-26)

**Branch:** `v5-vscode-works` @ `08d4b10e` (26 commits on origin, 0/286 behind)
**BUILD_ID:** `nR20fJizbrymthVDzwCLU`
**Build:** Next.js 16.4.3 standalone, 84MB

## Hosts Deployed

| Host | PID | Port | BUILD_ID | Health | Headers |
|---|---|---|---|---|---|
| mini4 (192.168.1.189 / 100.76.147.49) | 85835 | 20129 | nR20fJizbrymthVDzwCLU | 200 | ✅ all 4 |
| mini2 (100.96.109.61) | 10473 | 20128 | nR20fJizbrymthVDzwCLU | 200 | ✅ all 4 |

## Security Headers Verified (curl -D-)

```
HTTP/1.1 200 OK
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## requireAuth Live-Probe Matrix (fabricated UUIDs, unauthed)

All probes: `00000000-0000-0000-0000-000000000000`, no cookies, no CLI token.

| Route | mini4 :20129 | mini2 :20128 | Status |
|---|---|---|---|
| PUT /api/providers/{id} | 401 | 401 | ✅ new (f7a641d3) |
| DELETE /api/providers/{id} | 401 | 401 | ✅ new (f7a641d3) |
| PUT /api/combos/{id} | 401 | 401 | ✅ new (f7a641d3) |
| DELETE /api/combos/{id} | 401 | 401 | ✅ new (f7a641d3) |
| PUT /api/proxy-pools/{id} | 401 | 401 | ✅ new (f7a641d3) |
| DELETE /api/proxy-pools/{id} | 401 | 401 | ✅ new (f7a641d3) |
| POST /api/hooks | 401 | 401 | ✅ new (f7a641d3) |
| POST /api/providers/test-batch | 401 | 401 | ✅ new (f7a641d3) |
| POST /api/messages/{id}/annotations | 401 | 401 | ✅ new (f7a641d3) |
| DELETE /api/messages/{id}/annotations | 401 | 401 | ✅ new (f7a641d3) |
| PATCH /api/messages/{id}/annotations | 401 | 401 | ✅ new (f7a641d3) |
| POST /api/providers/{id}/test | 401 | 401 | ✅ regression clean |
| PUT /api/providers/{id}/overrides | 401 | 401 | ✅ regression clean |
| DELETE /api/provider-nodes/{id} | 401 | 401 | ✅ regression clean |

**14/14 gates fire 401 unauthed on both hosts.**

## Test Suite Evidence

```
✅ No regression. (now fails=54, baseline known=56, all known)
Tests: 4209 pass / 54 fail (baseline 56)
New file: tests/unit/requireAuth-negative-coverage.test.js (15 sentinel-enforced tests)
```

## Commits Shipped

- `f7a641d3` fix(security): close defense-in-depth gaps found by independent scrutiny
- `08d4b10e` test(security): negative 401 coverage for all requireAuth-gated routes

## What Closes

- Independent scrutiny HIGH finding: zero negative 401 coverage
- Independent scrutiny MEDIUM findings: timing-safe CLI token, 6 sibling mutations gated
- All 8 original security findings (coded + 3-way proven on both hosts)
- Finding #7 middleware promotion + route-level requireAuth (13 routes gated total)
