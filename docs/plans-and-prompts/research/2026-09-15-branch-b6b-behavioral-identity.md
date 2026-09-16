# Branch Research — B6b: Behavioral Identity (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #identity #gate-levels #profiles #binary-tree #branch-b6b

## Objective

Deep-dive the **behavioral identity** subtree: gate levels L0–L5 (B6b1) and profiles (B6b2), down to L6 leaves.

```
B6b BEHAVIORAL IDENTITY
├─ B6b1: GATE LEVELS (L0–L5)
│  ├─ B6b1L: ladder definition
│  │  ├─ B6b1LL: L0 none → L5 mTLS
│  │  └─ B6b1LR: per-level privileges
│  └─ B6b1R: gate evaluation
│     ├─ B6b1RL: highest cleared level wins
│     └─ B6b1RR: per-profile gate config
└─ B6b2: PROFILES
   ├─ B6b2L: identity bundle
   │  ├─ B6b2LL: name + app + UA + IP + headers
   │  └─ B6b2LR: policy (limits/models/priority)
   └─ B6b2R: resolution order
      ├─ B6b2RL: key → header → UA+IP → default
      └─ B6b2RR: LiteLLM JWT fallback precedent
```

## Codebase grounding

- No profiles or gate levels exist today. Identity is: API key (if present) + IP (rate limiter) + UA class (sourceApps.js, not yet wired to gating).
- The phase-2 research proposed the L0–L5 gate ladder and profiles; this branch deep-dives both.

## External research

### B6b1LL — The L0–L5 ladder

The gate ladder from phase-2 research (identity confidence, low → high):

| Level | Identity signal | Trust | Cost |
|-------|----------------|-------|------|
| L0 | None (anonymous) | None | 0 |
| L1 | UA fingerprint (sourceApps.js class) | Low (spoofable) | Low |
| L2 | Header claims (X-9R-App/User/Session) | Low–medium (post-auth) | Low |
| L3 | Profile match (UA + IP + headers + behavior) | Medium | Medium |
| L4 | API key / short-lived token | High | Medium |
| L5 | mTLS / client cert | Highest | High |

- **B6b1LR — per-level privileges:** each level unlocks privileges (higher limits, more models, queue priority). The mapping is configurable per profile: e.g. L0 → default limits, L3 → 2× limits, L4 → 4× limits + all models.

### B6b1R — Gate evaluation

- **B6b1RL — highest cleared level wins:** a request is evaluated against all levels; the *highest* level it clears determines its privileges. A request with a valid key (L4) is treated as L4 even if its UA is unknown (L1).
- **B6b1RR — per-profile gate config:** each profile specifies which levels it accepts and what each level grants. A strict profile might require L4+; a permissive profile accepts L1+.

### B6b2L — Identity bundle

- **B6b2LL — name + app + UA + IP + headers:** a profile is an identity bundle: name, expected app class(es), UA patterns, IP/subnet patterns, header claims, behavioral archetype (A2b). A request matches a profile when enough signals align.
- **B6b2LR — policy (limits/models/priority):** the profile carries the policy: rate limits (B1a/B1b), model allowlist (B4b2), queue weight (B2a), budgets (B4b1), content guardrails (B4a), gate requirements (B6b1).

### B6b2R — Resolution order

- **B6b2RL — key → header → UA+IP → default:** the resolution order from phase-2 research:
  1. API key present → key's profile (highest trust).
  2. No key, trusted subnet → profile by header claims (validated).
  3. No key, loopback → profile by UA + IP.
  4. Otherwise → default profile (strictest limits).
- **B6b2RR — LiteLLM JWT fallback precedent:** LiteLLM's JWT auth falls back to the authenticated user id when no key is present (phase 2 research). 9router's fallback chain mirrors this: identity degrades gracefully from key → claims → signals → default.

## Synthesis — design space

1. **Profile schema:**
   ```js
   profile = {
     id, name,
     match: { apps: [], uaPatterns: [], subnets: [], headerClaims: {}, archetype: null },
     policy: { gateMin: "L1", limits: {...}, models: [...], queueWeight: 5, budgets: [...], guardrails: {...} },
     state: "active" | "disabled"
   }
   ```
2. **Resolution engine:** per request, evaluate signals (key → headers → UA+IP → behavior) → find best-matching profile → compute gate level → apply policy. Cache resolution per (key, IP, UA) tuple with short TTL.
3. **Default profile:** always exists, strictest limits, L1 gate (UA only). Everything that matches nothing lands here.
4. **Dashboard:** profile editor (match rules + policy), per-request resolution trace (which signals matched which profile at which gate level), profile usage stats.
5. **Composition:** profiles are the *policy container*; all other branches (limits, queues, groups, guardrails, budgets) plug into the profile policy.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| L0–L5 ladder is the right identity-confidence model | High |
| Highest-cleared-level-wins is the right evaluation | High |
| Resolution order (key → header → UA+IP → default) is right | High |
| Profile = identity bundle + policy is the right schema | High |
| LiteLLM JWT fallback validates the degradation chain | High |

## Open questions

1. Should gate level be *per-request* (evaluate each time) or *per-session* (evaluate once, cache)? (Recommendation: per-session with TTL — cheaper, and identity doesn't change mid-session.)
2. Should profiles support *negative* match rules (e.g. "never match this UA")?
3. How do profiles interact with the existing API-key metadata (phase-1 ADR-009)? (Recommendation: key metadata becomes a profile reference.)

## Sources

- Code: `src/lib/sourceApps.js` (UA classes), `custom-server.rate-limiter.js` (IP), phase-1 ADR-009 (key metadata)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md` (gate levels, profiles sections)
- Industry: LiteLLM JWT auth fallback (phase 2 fetch), OpenRouter per-key guardrails