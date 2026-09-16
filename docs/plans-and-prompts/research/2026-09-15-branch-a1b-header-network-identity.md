# Branch Research — A1b: Header / Network Identity (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #source-tracking #headers #network-identity #binary-tree #branch-a1b

## Objective

Deep-dive the **header / network identity** subtree: client-supplied identity headers (A1b1) and IP/subnet trust (A1b2), down to L6 leaves.

```
A1b HEADER / NETWORK IDENTITY
├─ A1b1: CLIENT IDENTITY HEADERS
│  ├─ A1b1L: X-9R-App / X-9R-User / X-9R-Session
│  │  ├─ A1b1LL: trust model (post-auth only)
│  │  └─ A1b1LR: validation against known apps
│  └─ A1b1R: industry headers (OpenRouter, LiteLLM)
│     ├─ A1b1RL: HTTP-Referer + X-OpenRouter-Title
│     └─ A1b1RR: x-litellm-session-id, x-claude-code-session-id
└─ A1b2: IP / SUBNET TRUST
   ├─ A1b2L: loopback & trusted-subnet bypass
   │  ├─ A1b2LL: existing LOOPBACK set in rate-limiter
   │  └─ A1b2LR: custom-server X-Forwarded-For stripping
   └─ A1b2R: network gating (allow/deny lists)
      ├─ A1b2RL: per-subnet profiles
      └─ A1b2RR: mTLS / client certs (L5 gate)
```

## Codebase grounding

### A1b1L — X-9R-App / X-9R-User / X-9R-Session (proposed)

- From the phase-1 plan (M7): trusted identity headers `X-9R-App`, `X-9R-User`, `X-9R-Session` — **trusted only after key auth OR from a trusted subnet** (A1b1LL). This is the core trust rule: headers are *claims*, not *proof*.
- A1b1LR: `X-9R-App` value must validate against the known-app list (the `sourceApps.js` classes + profile names). Unknown values → treated as `unknown`, never as a privileged app.

### A1b1R — Industry headers

- **OpenRouter app attribution (A1b1RL):** `HTTP-Referer` (app URL) + `X-OpenRouter-Title` (app name) are the standard attribution headers; `X-OpenRouter-Categories` (comma-separated, e.g. `coding,chat`) and `X-OpenRouter-App-Visibility` (public/private) extend it. OpenRouter treats these as *attribution metadata*, not identity — they never grant access.
- **LiteLLM session headers (A1b1RR):** `x-litellm-session-id` (client-supplied session id for affinity + spend tracking) and `x-claude-code-session-id` (Claude Code's own session id, used by LiteLLM to group Claude Code spend). Anthropic's own API also receives `x-claude-code-session-id` from Claude Code.
- Lesson: the industry treats app/session headers as **observability + affinity signals**, with identity reserved for keys/JWT. 9router's post-auth trust model matches this.

### A1b2LL — Existing LOOPBACK set

- `custom-server.rate-limiter.js` has `LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"])` — loopback bypasses *all* rate limiting today.
- Design question: should loopback bypass *gates* too? For a local gateway, yes for convenience (the user's own agents), but the phase-2 research recommends making this configurable (a `trustedSubnets` list that defaults to loopback).

### A1b2LR — X-Forwarded-For stripping

- `custom-server.js` derives client IP from the **TCP socket** and strips attacker-controlled `X-Forwarded-For` — trusting forwarding headers only from a loopback reverse proxy. This is the security foundation for all IP-based identity: without it, any client could spoof `X-Forwarded-For` and bypass per-IP limits.
- Preserve this invariant when adding subnet gating.

### A1b2R — Network gating

- A1b2RL: per-subnet profiles — map `192.168.1.0/24` → profile "home-lab" with its own limits. Natural extension of the existing per-IP limiter (which already keys on IP).
- A1b2RR: mTLS / client certs = the L5 gate (highest confidence). Requires TLS termination at the gateway (same topology caveat as JA3). For a local gateway this is heavy; listed for completeness and for remote deployments.

## External research

- OpenRouter docs (fetched in phase 2): app attribution headers are metadata-only; guardrails and keys do the gating.
- LiteLLM docs (fetched in phase 2): `x-litellm-session-id` drives session affinity (`deployment_affinity_ttl_seconds`, default 3600) and spend attribution; `x-claude-code-session-id` groups Claude Code spend.
- Standard practice (nginx, proxies): `X-Forwarded-For` is untrusted unless the peer is a known proxy — matches 9router's existing stance.

## Synthesis — design space

1. **Header trust ladder** (matches gate levels L2/L3):
   - Header from authenticated key → trusted (identity = key's profile, headers refine it).
   - Header from trusted subnet → trusted (identity = profile matched by UA/headers).
   - Header from anywhere else → ignored (identity = default profile).
2. **Validation rules for X-9R-App:** must be in known-app list; `X-9R-User` must match `^[a-zA-Z0-9._-]{1,64}$`; `X-9R-Session` must match `^[a-zA-Z0-9._-]{1,128}$`. Reject (or ignore) anything else — never echo invalid values into logs verbatim (log-injection guard).
3. **IP trust config:** `trustedSubnets` (default `127.0.0.1/8, ::1/128`) + optional `allowSubnets` / `denySubnets` lists. Deny wins over allow. Loopback bypass becomes a special case of trustedSubnets.
4. **mTLS (L5):** out of scope for v1 of the local gateway; document as the remote-deployment upgrade path.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Headers are claims, not proof — post-auth trust is correct | High |
| Industry treats app headers as attribution, not identity | High |
| XFF stripping in custom-server.js is the security foundation | High |
| mTLS is overkill for localhost-first topology | High |

## Open questions

1. Should `X-9R-App` accept profile names (user-defined) in addition to known app classes?
2. Should trusted-subnet header trust be on by default or opt-in?
3. Do we need `X-9R-Session` at all, or does the existing `conversationFingerprint` (A2a2) suffice?

## Sources

- Code: `custom-server.js`, `custom-server.rate-limiter.js` (read in prior research)
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M7 trusted headers), `2026-09-14-keyless-governance-research.md` (gate levels L2/L5)
- Industry: OpenRouter app-attribution docs, LiteLLM session-affinity docs (both fetched in phase 2)