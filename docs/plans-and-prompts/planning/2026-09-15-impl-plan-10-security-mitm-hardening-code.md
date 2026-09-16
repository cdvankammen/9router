# Implementation Plan 10 — Security & MITM Hardening — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #security #mitm #tls #certificate #hardening #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/mitm/`, `custom-server.js`, `src/lib/security/` existence).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-10-security-mitm-hardening.md`, `../research/9router/14-mitm-deep-dive.md`

## Scope

**In scope:** TLS/certificate hardening (cert store permissions, rotation, validation); interception safety (opt-in, scope limiting, credential protection, reversibility); credential redaction; audit logging.
**Out of scope:** full PKI infrastructure; HSM integration.

## Milestones

### M1 — TLS & certificate hardening

**Reference code (`src/mitm/certStore.js`):**

```js
import { mkdirSync, chmodSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class CertStore {
  constructor(dir) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o700); // dedicated cert directory with proper permissions
  }

  listCerts() {
    return readdirSync(this.dir).filter((f) => f.endsWith(".pem"));
  }

  getCert(name) {
    return readFileSync(join(this.dir, `${name}.pem`), "utf8");
  }

  rotateCert(name, newCert) {
    // Grace period: keep old cert until new one verified
    writeFileSync(join(this.dir, `${name}.old.pem`), this.getCert(name));
    writeFileSync(join(this.dir, `${name}.pem`), newCert);
    chmodSync(join(this.dir, `${name}.pem`), 0o600);
    return { rotated: name, old: `${name}.old.pem` };
  }
}
```

**Acceptance criteria:** cert store 0700; rotation with grace period; audit log of issuance/rotation.

### M2 — Interception safety

**Reference code (`src/mitm/interception.js`):**

```js
// Opt-in: MITM only for explicitly configured providers.
// Scope limiting: intercept only configured hostnames; never dashboard traffic.
export function shouldIntercept(hostname, settings) {
  if (!settings.mitm?.enabled) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false; // never dashboard
  return settings.mitm.allowedHostnames?.includes(hostname) ?? false;
}

// Credential protection: never log Authorization headers; redact in traces.
export function redactHeaders(headers) {
  const redacted = { ...headers };
  for (const key of Object.keys(redacted)) {
    if (/authorization|cookie|x-api-key|api-key/i.test(key)) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}
```

**Acceptance criteria:** interception opt-in + scoped; credentials never logged; clean uninstall path.

### M3 — Credential protection + audit

**Reference code (`src/lib/security/redaction.js`):**

```js
// Centralized redaction utility — used everywhere secrets might leak.
const PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,          // OpenAI-style keys
  /Bearer\s+[a-zA-Z0-9._-]+/gi,    // Bearer tokens
  /x-api-key:\s*[a-zA-Z0-9._-]+/gi,
  /Authorization:\s*[^\n]+/gi,
];

export function redact(text) {
  let out = String(text ?? "");
  for (const p of PATTERNS) out = out.replace(p, "[REDACTED]");
  return out;
}
```

**Reference code (`src/lib/db/repos/auditRepo.js`):**

```js
export async function logAuditEvent({ type, actor, detail }) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO audit_events (id, type, actor, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), type, actor, JSON.stringify(detail), Date.now()]
  );
}
// Events: cert changes, interception changes, credential access.
```

**Acceptance criteria:** redaction utility covers key patterns; audit events logged; retention policy.

### M4 — Tests

**Files touched:** `tests/unit/mitm-security.test.js` (new).

**Acceptance criteria:** cert rotation, redaction, scope limiting tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Cert rotation breaks connections | Grace period; overlap |
| Redaction misses paths | Centralized utility; tests |
| Interception scope creep | Explicit allowlist; tests |
| Audit log growth | Retention policy |

## Verification

- Unit: cert rotation, redaction, scope limiting
- Manual: enable MITM for a provider → verify interception scoped; check audit log
- Regression: `tests/__baseline__/verify-no-regression.mjs`