# Branch Research — B5a: Key Lifecycle (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #credentials #key-lifecycle #rotation #binary-tree #branch-b5a

## Objective

Deep-dive the **key lifecycle** subtree: rotation (B5a1) and disable/archive (B5a2), down to L6 leaves.

```
B5a KEY LIFECYCLE
├─ B5a1: ROTATION
│  ├─ B5a1L: regenerate with grace period
│  │  ├─ B5a1LL: old key valid during grace
│  │  └─ B5a1LR: LiteLLM key regeneration
│  └─ B5a1R: expiry presets
│     ├─ B5a1RL: 3h/1d/7d/30d/custom (Anthropic)
│     └─ B5a1RR: expired → 401
└─ B5a2: DISABLE / ARCHIVE
   ├─ B5a2L: disable (immediate)
   │  ├─ B5a2LL: 401 on disabled
   │  └─ B5a2LR: keep usage history
   └─ B5a2R: archive (soft delete)
      ├─ B5a2RL: audit trail
      └─ B5a2RR: restore path
```

## Codebase grounding

### What exists

- API-key auth for the gateway (`/v1/*` requires a key; `JWT_SECRET` signs session cookies; `API_KEY_SECRET` protects stored keys).
- The phase-1 plan (M6) proposed key lifecycle: rotation, expiry, disable. This branch deep-dives the mechanics.
- Keys are stored in the SQLite layer (`src/lib/db/`); the exact key repo wasn't read in prior research but the DB layer is the storage home.

### What doesn't exist

- No key expiry, no rotation workflow, no disable/archive states.

## External research

### B5a1L — Regenerate with grace period

- **B5a1LL — old key valid during grace:** rotation best practice: when a key is regenerated, the *old* key remains valid for a grace period (e.g. 24h) so clients can switch over without downtime. After the grace period, the old key is revoked.
- This is standard in API platforms (Stripe, GitHub, Anthropic): regenerate → old key works for N hours → then dies. The alternative (immediate revocation) breaks clients that cached the old key.
- **B5a1LR — LiteLLM key regeneration:** LiteLLM supports key regeneration (phase 2 research): a new key value is minted for the same key metadata (budget, models, metadata). The old value is invalidated (LiteLLM does NOT keep a grace period by default — worth noting as a config option).

### B5a1R — Expiry presets

- **B5a1RL — 3h/1d/7d/30d/custom (Anthropic):** Anthropic's admin API lets you create keys with expiry presets (3 hours, 1 day, 7 days, 30 days, custom). Short-lived keys are the security best practice: a leaked key is only useful for its remaining lifetime.
- **B5a1RR — expired → 401:** an expired key returns 401 with a clear error ("key expired"). The client must mint a new key (or the admin must extend).

### B5a2L — Disable (immediate)

- **B5a2LL — 401 on disabled:** disabling a key is immediate: the key stops working (401) but the record stays. This is the "kill switch" for a compromised or misbehaving key.
- **B5a2LR — keep usage history:** the disabled key's usage history is preserved (audit trail). The key record shows "disabled at <time> by <admin>".

### B5a2R — Archive (soft delete)

- **B5a2RL — audit trail:** archiving is a soft delete: the key is hidden from active lists but its record + usage history remain for audit. Distinguish from disable: disabled = revoked but visible; archived = hidden but recoverable.
- **B5a2RR — restore path:** an archived key can be restored (un-archive) — useful when a "deleted" key turns out to be needed. Restore returns it to its previous state (or disabled state, safer).

## Synthesis — design space

1. **Key states:** `active → disabled → archived` (one-way disable; archive reversible). Plus `expired` (derived from expiry timestamp).
2. **Rotation workflow:** regenerate → new value minted, old value kept valid for grace period (configurable, default 24h) → old value revoked at grace end. Log both events.
3. **Expiry:** keys created with expiry presets (3h/1d/7d/30d/custom). Expired → 401 with clear error. Admin can extend.
4. **Disable:** immediate 401; usage history preserved; reason + admin recorded.
5. **Archive:** soft delete; hidden from lists; restore path; audit trail.
6. **Dashboard:** key table with state badges, expiry countdown, regenerate/disable/archive/restore actions, event log per key.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Grace-period rotation is the right workflow | High |
| Expiry presets (Anthropic model) are the right shape | High |
| Disable = immediate 401 + preserved history | High |
| Archive = soft delete + restore path | High |

## Open questions

1. Should rotation grace period be configurable per key or global?
2. Should expired keys be auto-archived after N days (cleanup)?
3. Does 9router need key *scopes* (e.g. read-only keys) in addition to lifecycle states? (Phase-1 plan mentioned per-key metadata — scopes are a natural extension.)

## Sources

- Code: `src/lib/db/` (key storage), `JWT_SECRET`/`API_KEY_SECRET` env contract (CLAUDE.md)
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M6), `2026-09-14-keyless-governance-research.md`
- Industry: Anthropic admin API key expiry presets, LiteLLM key regeneration (phase 2 fetch), Stripe/GitHub key rotation conventions