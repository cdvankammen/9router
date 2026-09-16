# Branch Research — B5b: Alternative Auth (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #credentials #auth #tokens #oauth #binary-tree #branch-b5b

## Objective

Deep-dive the **alternative auth** subtree: short-lived tokens (B5b1) and OAuth/device flow (B5b2), down to L6 leaves.

```
B5b ALTERNATIVE AUTH
├─ B5b1: SHORT-LIVED TOKENS
│  ├─ B5b1L: profile → 5-min token
│  │  ├─ B5b1LL: no static key rotation
│  │  └─ B5b1LR: WIF precedent (Anthropic)
│  └─ B5b1R: device attestation
│     ├─ B5b1RL: App Attest (iOS/macOS)
│     └─ B5b1RR: WebAuthn
└─ B5b2: OAUTH / DEVICE FLOW
   ├─ B5b2L: device authorization grant
   │  ├─ B5b2LL: browser-based approval
   │  └─ B5b2LR: overkill for local gateway
   └─ B5b2R: existing 9router OAuth
      ├─ B5b2RL: provider OAuth + token refresh
      └─ B5b2RR: reuse for profile auth
```

## Codebase grounding

### What exists

- 9router already has **provider OAuth + token refresh** (phase-1 research: OAuth credential management, token refresh for upstream providers). This is B5b2R.
- API-key auth for the gateway itself.
- `JWT_SECRET` signs session cookies (dashboard auth).

### What doesn't exist

- No short-lived token minting for clients.
- No device attestation.
- No device authorization flow.

## External research

### B5b1L — Profile → 5-min token

- **B5b1LL — no static key rotation:** the pain with static keys is rotation (B5a1). Short-lived tokens solve it differently: mint a token from a profile (identity + policy), valid for 5 minutes; the client uses it; it expires; the client mints another (or the gateway auto-refreshes).
- This is the "keyless" sweet spot: the *profile* is the durable identity; the *token* is the ephemeral credential. No key to rotate, no key to leak (a 5-min token is nearly useless if stolen).
- **B5b1LR — WIF precedent (Anthropic):** Anthropic's WIF (Workload Identity Federation) lets workloads authenticate with short-lived credentials instead of static API keys (phase 2 research). The pattern: identity provider → short-lived token → API. 9router's version: profile → 5-min token → gateway.

### B5b1R — Device attestation

- **B5b1RL — App Attest (iOS/macOS):** Apple's App Attest proves a request comes from a genuine, unmodified app on a genuine device. Heavyweight; for a local gateway, mostly irrelevant (the "attacker" is a local agent, not a remote device).
- **B5b1RR — WebAuthn:** passkeys/FIDO2 — browser-based attestation. Also heavyweight; relevant only if 9router's dashboard needs strong auth (it already has session cookies + JWT).

### B5b2L — Device authorization grant

- **B5b2LL — browser-based approval:** the device flow (RFC 8628): a client shows a code, the user approves in a browser, the client polls for a token. Used by CLIs (GitHub CLI, AWS CLI).
- **B5b2LR — overkill for local gateway:** for 9router, the "user" is the admin on the same machine. A device flow adds a browser round-trip to solve a problem that doesn't exist locally. Listed for completeness (and for remote deployments).

### B5b2R — Existing 9router OAuth

- **B5b2RL — provider OAuth + token refresh:** 9router already manages upstream provider OAuth (e.g. Anthropic, Google) with token refresh. This is *upstream* auth, not *gateway* auth.
- **B5b2RR — reuse for profile auth:** the existing OAuth machinery (token storage, refresh) could be *reused* to authenticate profiles: a profile could be bound to an upstream OAuth identity (e.g. "this profile is the Google account X"). But this is a stretch — the local gateway doesn't need it.

## Synthesis — design space

1. **Recommended: short-lived tokens (B5b1L) as the keyless auth mechanism.**
   - Profile → mint token (JWT signed with `JWT_SECRET`, claims: profileId, expiry 5min, policy hash).
   - Client sends `Authorization: Bearer <token>`.
   - Gateway validates signature + expiry + policy hash (policy changes invalidate old tokens).
   - No static key rotation; token theft is low-value (5-min lifetime).
2. **Device attestation:** out of scope for v1 (documented as future for remote deployments).
3. **Device flow:** out of scope for v1 (documented as future for remote deployments).
4. **Reuse existing OAuth:** the token-refresh machinery is upstream-only; don't overload it for gateway auth in v1.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Short-lived tokens are the right keyless auth | High |
| WIF precedent validates the pattern | High |
| Device attestation is overkill for local gateway | High |
| Device flow is overkill for local gateway | High |
| Existing OAuth is upstream-only (don't overload) | High |

## Open questions

1. Token lifetime: 5 minutes is the phase-2 suggestion — should it be configurable (1min–1h)?
2. Should the token be a JWT (stateless, needs JWT_SECRET) or an opaque DB-backed token (revocable)? Opaque tokens are revocable per-token; JWTs are stateless but can't be individually revoked.
3. Should profiles be able to mint tokens via the dashboard (admin action) or via an API endpoint (programmatic)?

## Sources

- Code: `JWT_SECRET` env contract (CLAUDE.md), existing OAuth machinery (`src/lib/` OAuth repos — phase-1 research)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md` (short-lived tokens section)
- Industry: Anthropic WIF (phase 2 fetch), RFC 8628 device flow, Apple App Attest, WebAuthn/FIDO2