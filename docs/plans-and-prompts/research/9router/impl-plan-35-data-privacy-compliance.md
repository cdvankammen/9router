---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, data-privacy, gdpr, redaction, compliance
---

# Implementation Plan 35 — Data Privacy & Compliance

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "privacy/compliance" option: data privacy controls and compliance readiness.

## 1. Goal

Add data privacy controls to 9Router: prompt redaction, data retention policies, privacy modes, and compliance readiness (GDPR-style) — so user data is protected by default.

## 2. Background (from research)

- **9Router current state**: usageDb logs requests; logs under ~/.9router; no redaction layer.
- **Research findings**: prompts contain sensitive data; logs must be redactable; retention policies needed; privacy modes (no-log, redact, full) give users control.

## 3. Design

### 3.1 Redaction

- **Redaction patterns**: emails, phones, API keys, IPs, credit cards.
- **Redaction modes**: off, redact, hash, block.
- **Redaction coverage**: logs, usage, traces, error messages.

### 3.2 Retention Policies

- **Retention periods**: per-data-type (usage, logs, traces).
- **Retention enforcement**: scheduled cleanup.
- **Retention config**: dashboard + API.

### 3.3 Privacy Modes

- **No-log mode**: no request content stored.
- **Redact mode**: content redacted before storage.
- **Full mode**: full logging (opt-in).
- **Mode enforcement**: per-key or global.

### 3.4 Compliance

- **Data inventory**: what data is stored where.
- **Export**: user data export.
- **Deletion**: user data deletion.
- **Audit**: privacy events logged.

## 4. Implementation Steps

1. Build redaction layer.
2. Add retention policies.
3. Add privacy modes.
4. Add export/deletion.
5. Tests: redaction, retention, modes.

## 5. Files Touched

- `src/lib/privacy/` (new: redaction, retention, modes)
- `src/lib/usageDb.js` (privacy integration)
- `src/lib/db/repos/privacyRepo.js` (new)
- `src/app/api/v1/privacy/route.js` (new)
- Dashboard privacy page (new)
- `tests/unit/privacy.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Redaction misses | Pattern coverage; tests |
| Retention data loss | Configurable; warnings |
| Mode confusion | Clear defaults |
| Compliance scope | Prioritized |

## 7. Success Criteria

- Redaction operational.
- Retention enforced.
- Privacy modes work.
- Export/deletion functional.

## 8. Related Plans
- Plan 10 (Security) — security synergy.
- Plan 8 (Observability) — trace redaction.
- Plan 25 (Cloud Sync) — sync privacy.