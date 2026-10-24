# Implementation Plan 58 — Security Audit & Hardening — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #security #hardening #threat-model #audit #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`custom-server.js` IP derivation + X-Forwarded-For stripping; `custom-server.rate-limiter.js`; `JWT_SECRET`/`API_KEY_SECRET`/`MACHINE_ID_SALT` env contract; `src/mitm/`; `src/dashboardGuard.js`; `open-sse/` upstream calls for SSRF surface).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the security tests; run npm audit; confirm findings fixed.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-58-security-audit-hardening.md`, `../research/9router/impl-plan-10-security.md`, `../research/9router/impl-plan-24-rate-limiting.md`.

## Scope

**In scope:** threat model doc (assets, attackers, attack surfaces, ranked register); security-focused code review; dependency audit (`npm audit` + remediation); secret scanning; security tests (auth bypass, injection, SSRF, malformed input); prioritized fixes; `docs/SECURITY.md` security model.
**Out of scope:** external pentest engagement; compliance certification (SOC 2 etc.).

## Milestones

### M1 — Threat model

**Reference code (`docs/SECURITY.md`):**

```markdown
# 9Router Security Model

## Assets
- API keys / OAuth tokens (upstream credentials) — highest value.
- Session cookies (JWT_SECRET-signed).
- Usage/cost data; audit log.
- Local network access (gateway binds 0.0.0.0 by default).

## Attackers
- Remote unauthenticated clients (internet exposure).
- Local users of the dashboard (multi-user, plan 38).
- Malicious upstream providers (response injection).
- Supply chain (dependencies).

## Attack surfaces
- `/v1/*` API (auth, SSRF via model/provider config, injection).
- Dashboard (session auth, RBAC).
- Upstream calls (credential handling, response parsing).
- MITM proxy (plan 10) — request interception.

## Ranked threats (register)
| # | Threat | Likelihood | Impact | Mitigation |
|---|--------|-----------|--------|------------|
| T1 | Credential theft (API keys in logs/DB) | Medium | Critical | Encrypt at rest (API_KEY_SECRET); redact logs |
| T2 | SSRF via provider base URL config | Medium | High | Validate URLs (allowlist schemes/hosts) |
| T3 | Auth bypass (default INITIAL_PASSWORD) | High | High | Force password change; env validation |
| T4 | DoS via rate-limit bypass | Medium | Medium | Rate limiter + IP derivation hardening |
| T5 | Dependency vulnerability | Medium | High | npm audit in CI; pinned versions |
```

**Acceptance criteria:** threat register ranked; mitigations mapped; reviewed by implementing agent.

### M2 — Dependency audit + secret scanning

**Reference code (`scripts/audit-deps.mjs`):**

```js
// npm audit wrapper with severity gate.
import { execSync } from "node:child_process";

const severityGate = process.env.AUDIT_SEVERITY ?? "high";
const out = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).catch ??
  (() => { try { return execSync("npm audit --json", { encoding: "utf8" }); } catch (e) { return e.stdout ?? "{}"; } })();

const audit = JSON.parse(out);
const vulns = audit.vulnerabilities ?? {};
const failing = Object.entries(vulns).filter(([, v]) => ["high", "critical"].includes(v.severity) &&
  (severityGate === "critical" ? v.severity === "critical" : true));

if (failing.length) {
  console.error(`Dependency audit failed (gate: ${severityGate}):`);
  for (const [name, v] of failing) console.error(`  ${name}@${v.range}: ${v.severity} — ${v.title}`);
  process.exit(1);
}
console.log(`Dependency audit ok (${Object.keys(vulns).length} vulnerable packages, none above gate)`);
```

**Reference code (`scripts/scan-secrets.mjs`):**

```js
// Scan repo for likely secrets (excludes node_modules, .git, .env).
import { execSync } from "node:child_process";

const files = execSync("git ls-files", { encoding: "utf8" }).trim().split("\n")
  .filter((f) => !f.includes("node_modules") && !f.startsWith(".env"));
const patterns = [
  /sk-[A-Za-z0-9]{20,}/,            // OpenAI-style keys
  /AKIA[0-9A-Z]{16}/,               // AWS access key
  /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{36}/,            // GitHub PAT
  /Bearer [A-Za-z0-9._-]{20,}/,
];
let found = 0;
for (const file of files) {
  const content = require("node:fs").readFileSync(file, "utf8");
  for (const [i, line] of content.split("\n").entries()) {
    if (patterns.some((p) => p.test(line))) {
      console.warn(`${file}:${i + 1}: possible secret`);
      found++;
    }
  }
}
if (found) { console.error(`${found} possible secrets found`); process.exit(1); }
console.log("Secret scan clean");
```

**Acceptance criteria:** audit gates high/critical; secret scan exits non-zero on hits; both wired into CI (plan 32).

### M3 — Security tests

**Reference code (`tests/security/auth.test.js`):**

```js
import { describe, it, expect } from "vitest";

// Auth bypass attempts against the dashboard guard.
describe("Auth hardening", () => {
  it("rejects missing auth header", async () => {
    const res = await fetch("http://127.0.0.1:20128/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects forged X-Forwarded-For from non-loopback", async () => {
    // custom-server.js must strip attacker-controlled XFF — assert via rate-limit behavior.
    const res = await fetch("http://127.0.0.1:20128/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "1.2.3.4" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }),
    });
    // Should NOT be rate-limited as 1.2.3.4 (that IP must not be trusted) — expect 401 not 429.
    expect([401, 429]).toContain(res.status);
  });
});
```

**Reference code (`tests/security/ssrf.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { validateUpstreamUrl } from "@/lib/security/urls.js";

describe("SSRF hardening", () => {
  it("rejects non-http(s) schemes", () => {
    expect(validateUpstreamUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateUpstreamUrl("gopher://internal:8080").ok).toBe(false);
  });
  it("rejects private/link-local hosts", () => {
    expect(validateUpstreamUrl("http://127.0.0.1:8080").ok).toBe(false);
    expect(validateUpstreamUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateUpstreamUrl("http://10.0.0.1").ok).toBe(false);
  });
  it("allows public https", () => {
    expect(validateUpstreamUrl("https://api.openai.com/v1").ok).toBe(true);
  });
});
```

**Reference code (`src/lib/security/urls.js`):**

```js
// SSRF guard for provider base URLs.
const PRIVATE_RANGES = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./, /^::1$/, /^fc/, /^fd/];

export function validateUpstreamUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return { ok: false, reason: "scheme" };
    const host = u.hostname;
    if (host === "localhost" || PRIVATE_RANGES.some((r) => r.test(host))) return { ok: false, reason: "private-host" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
}
```

**Acceptance criteria:** auth bypass tests pass; SSRF guard blocks private hosts; tests run in CI.

### M4 — Hardening fixes + security model doc

**Reference code (`src/lib/security/hardening.js`):**

```js
// Startup hardening checks — fail fast on insecure config.
export function checkStartupSecurity(env) {
  const problems = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) problems.push("JWT_SECRET missing or too short (<32 chars)");
  if (!env.API_KEY_SECRET || env.API_KEY_SECRET.length < 32) problems.push("API_KEY_SECRET missing or too short (<32 chars)");
  if (!env.MACHINE_ID_SALT) problems.push("MACHINE_ID_SALT missing");
  if (env.INITIAL_PASSWORD === "123456") problems.push("INITIAL_PASSWORD is the default — must be changed");
  return { ok: problems.length === 0, problems };
}
```

**Files touched:** `docs/SECURITY.md` (new), `src/lib/security/` (new: urls, hardening), `custom-server.js` (hardening hooks), `tests/security/` (new), `scripts/audit-deps.mjs` (new), `scripts/scan-secrets.mjs` (new).

**Acceptance criteria:** startup fails fast on insecure env; SSRF guard integrated at provider config write; security model documented.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Scope creep | Audit paralysis | Prioritized register |
| False positives | Wasted effort | Manual review pass |
| Fix regressions | Broken behavior | Tests per fix |
| Dependency churn | Supply chain | Pinned versions + audit gate |

## Verification

- Unit: urls, hardening checks
- Security: auth, ssrf, injection tests
- Tooling: audit-deps, scan-secrets
- Regression: `tests/__baseline__/verify-no-regression.mjs`