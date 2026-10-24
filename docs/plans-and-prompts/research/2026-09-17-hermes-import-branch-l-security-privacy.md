# Branch L: Security & Privacy Considerations — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, security, privacy, binary-tree, branch-l

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch L: SECURITY & PRIVACY CONSIDERATIONS

Ensure imported messages are stored securely, sensitive data is protected, and privacy requirements are met.

### L2 L1: AUTHENTICATION & AUTHORIZATION

#### L3 L1a: Import API Auth
- **L4 L1a1: API Key Auth**
  - L5: Require API key for `/api/messages/import` endpoint
  - L6: Use existing `API_KEY_SECRET` from `.env`, validate in middleware
- **L4 L1a2: IP Whitelist**
  - L5: Optionally restrict import API to specific IPs (e.g., localhost only)
  - L6: Configurable in settings: "Allowed import IPs"

#### L3 L1b: Source Verification
- **L4 L1b1: Source ID Validation**
  - L5: Each import source has unique ID (hermes, claude-code, etc.) → validate in request
  - L6: Prevent spoofing: only trusted sources can import
- **L4 L1b2: Signature Verification**
  - L5: Optionally sign import requests with HMAC → verify signature on server
  - L6: Prevent tampering during transit

### L2 L2: DATA SANITIZATION

#### L3 L2a: Header Sanitization
- **L4 L2a1: Auth Header Removal**
  - L5: Strip `Authorization`, `X-API-Key`, `Cookie`, `Token` headers before storage
  - L6: Case-insensitive, handle variations
- **L4 L2a2: Custom Header List**
  - L5: Configurable list of headers to strip (settings)
  - L6: User can add provider-specific auth headers

#### L3 L2b: Body Sanitization
- **L4 L2b1: API Key Detection**
  - L5: Regex scan for API key patterns: `sk-...`, `key-...`, `Bearer ...`
  - L6: Replace with `[REDACTED]`, log redaction count
- **L4 L2b2: PII Redaction (Optional)**
  - L5: Regex scan for email, phone, SSN patterns in message content
  - L6: Configurable toggle: "Enable PII redaction"

### L2 L3: ENCRYPTION

#### L3 L3a: At-Rest Encryption
- **L4 L3a1: SQLite Encryption**
  - L5: Use SQLCipher for encrypted SQLite database
  - L6: Encrypt entire DB file, require key to read
- **L4 L3a2: Field-Level Encryption**
  - L5: Encrypt sensitive fields (request_json, response_json) before storage
  - L6: Decrypt on read, use `ENCRYPTION_KEY` from `.env`

#### L3 L3b: In-Transit Encryption
- **L4 L3b1: HTTPS for Import API**
  - L5: Require HTTPS for `/api/messages/import` (except localhost)
  - L6: Use existing TLS termination in Next.js
- **L4 L3b2: Payload Encryption**
  - L5: Optionally encrypt import payload before sending → decrypt on server
  - L6: For highly sensitive data (e.g., medical, financial)

### L2 L4: ACCESS CONTROL

#### L3 L4a: Role-Based Access
- **L4 L4a1: Import Permission**
  - L5: Only users with "import" permission can access `/api/messages/import`
  - L6: Use existing RBAC system (if implemented)
- **L4 L4a2: View Permission**
  - L5: Only users with "view imported" permission can see imported messages
  - L6: Separate from native message view permission

#### L3 L4b: Audit Logging
- **L4 L4b1: Import Audit Log**
  - L5: Log every import: `{timestamp, source, userId, messageCount, ip}`
  - L6: Store in `import_audit_log` table, viewable in admin panel
- **L4 L4b2: Access Audit Log**
  - L5: Log every access to imported messages: `{timestamp, userId, query, resultCount}`
  - L6: Detect unauthorized access patterns

### L2 L5: PRIVACY COMPLIANCE

#### L3 L5a: GDPR Compliance
- **L4 L5a1: Right to Erasure**
  - L5: API endpoint to delete all imported messages for a user: `DELETE /api/messages/import?userId=...`
  - L6: Cascade delete from all tables
- **L4 L5a2: Data Portability**
  - L5: API endpoint to export all imported messages for a user: `GET /api/messages/import/export?userId=...`
  - L6: Return JSON or CSV format

#### L3 L5b: Data Retention
- **L4 L5b1: Retention Policy**
  - L5: Configurable retention: "Delete imported messages older than N days"
  - L6: Background job runs nightly, enforces policy
- **L4 L5b2: Consent Tracking**
  - L5: Track consent for each import source: `{source, consentedAt, consentedBy}`
  - L6: Only import from sources with valid consent

### L2 L6: INCIDENT RESPONSE

#### L3 L6a: Breach Detection
- **L4 L6a1: Anomaly Detection**
  - L5: Detect unusual import patterns: sudden spike in imports, imports from unknown IPs
  - L6: Alert via webhook (Apprise URL)
- **L4 L6a2: Sanitization Failure Detection**
  - L5: Detect if auth headers or PII leaked into DB (sanitization bug)
  - L6: Periodic scan, alert if found

#### L3 L6b: Breach Response
- **L4 L6b1: Quarantine**
  - L5: If breach detected → quarantine imported_messages table (read-only)
  - L6: Prevent further damage, investigate
- **L4 L6b2: Notification**
  - L5: If PII leaked → notify affected users per GDPR requirements
  - L6: Template email, audit log of notifications sent

## Implementation Priority

1. **Header Sanitization + API Key Auth** (core) — 2 days
2. **Audit Logging** — 1 day
3. **PII Redaction + GDPR Endpoints** — 2 days
4. **Encryption (At-Rest + In-Transit)** — 2 days

## Open Questions

- Should sanitization be mandatory or configurable per source?
- How to handle encrypted request/response bodies (can't sanitize if can't read)?
- Should the system support differential privacy (add noise to aggregated stats)?

## Related Implementation Plans

- `9router/impl-plan-import-03-import-api.md` — `sanitizer.js` (redacts `authorization`, `x-api-key`, `cookie`, `token`, `api-key` per `requestDetailsRepo.sanitizeHeaders()` precedent) + timing-safe `checkImportAuth`
- `9router/impl-plan-import-09-observability-export.md` — HMAC-signed webhook exporter (secret never leaves the server)
- `9router/impl-plan-import-10-multi-tenant-import.md` — `tenantKeys.js` hashes import keys (SHA-256) at rest, shows once; app-level tenant `WHERE` enforcement (SQLite has no RLS)
- `9router/impl-plan-import-08-messages-page-ui.md` — import modal shows what will be stored/redacted before committing
