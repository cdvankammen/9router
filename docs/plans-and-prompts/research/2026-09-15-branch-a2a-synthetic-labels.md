# Branch Research — A2a: Synthetic Labels (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #source-tracking #synthetic-labels #fingerprints #binary-tree #branch-a2a

## Objective

Deep-dive the **synthetic labels** subtree: stable derived labels (A2a1) and session fingerprints (A2a2), down to L6 leaves.

```
A2a SYNTHETIC LABELS
├─ A2a1: STABLE DERIVED LABELS
│  ├─ A2a1L: hash(uaClass + ipPrefix + sessionId)
│  │  ├─ A2a1LL: FNV-1a (smartRouter precedent)
│  │  └─ A2a1LR: privacy (hash only, never inputs)
│  └─ A2a1R: hash(uaClass + taskType)
│     ├─ A2a1RL: usage-pattern grouping
│     └─ A2a1RR: stability across sessions
└─ A2a2: SESSION FINGERPRINTS
   ├─ A2a2L: conversationFingerprint (FNV-1a, 5-min TTL)
   │  ├─ A2a2LL: first system/user messages
   │  └─ A2a2LR: sticky-session reuse
   └─ A2a2R: session-id headers (client-supplied)
      ├─ A2a2RL: x-claude-code-session-id
      └─ A2a2RR: metadata.session_id in body
```

## Codebase grounding

### A2a1LL — FNV-1a precedent in smartRouter

- `open-sse/services/smartRouter.js` already implements `conversationFingerprint(messages)` using **FNV-1a** hashing — a fast, non-cryptographic 32-bit hash. This is the in-repo precedent for synthetic labels.
- FNV-1a properties: O(1) per byte, deterministic, no allocation, trivially implementable in plain JS (no deps). Collisions are possible (32-bit) but acceptable for *grouping* purposes (not security).
- For *security-sensitive* labels (e.g. identity tokens), use a real hash (SHA-256 via `node:crypto`) — FNV-1a is for grouping, not authentication.

### A2a1L — hash(uaClass + ipPrefix + sessionId)

- The proposed stable label: `fnv1a(uaClass + "|" + ipPrefix + "|" + sessionId)` → a stable pseudo-identity for grouping usage without storing raw inputs.
- **Privacy (A2a1LR):** only the hash is persisted; the inputs (UA class, IP prefix, session id) are never stored together. This extends the existing sourceApps.js privacy stance (raw UA never persisted).
- Stability: same inputs → same label across requests, so usage analytics can group by label. IP prefix (e.g. `/24`) keeps the label stable across DHCP changes within a subnet.

### A2a1R — hash(uaClass + taskType)

- A coarser label: groups by *what kind of work* (task type from `classifyTask`) rather than *who*. Enables "how much of my qwen budget goes to code:debugging vs research_report" analytics.
- A2a1RL: usage-pattern grouping — the label is the grouping key for the dashboard's usage views.
- A2a1RR: stability across sessions — taskType is derived from message content, so the same user doing the same work produces the same label even across different sessions. This is a *feature* for analytics but a *limitation* for identity (it can't distinguish two users doing identical work).

### A2a2L — conversationFingerprint (existing)

- `conversationFingerprint(messages)` hashes the first system/user messages (A2a2LL) to identify a conversation; `getStickySession`/`setStickySession` reuse it with a **5-minute TTL** (`DEFAULT_SESSION_TTL_MS = 5*60*1000`) and a 500-entry cap (`MAX_SESSION_ENTRIES = 500`) (A2a2LR).
- Purpose today: session stickiness for model selection (same conversation → same model). Governance reuse: the same fingerprint can key per-conversation rate limits and queue priority.

### A2a2R — client-supplied session ids

- A2a2RL: `x-claude-code-session-id` — Claude Code sends this; LiteLLM uses it to group spend. 9router can capture it as a *claim* (post-auth trust, per A1b).
- A2a2RR: `metadata.session_id` in the request body — some SDKs put session ids in `metadata`. Same trust caveat: body fields are claims.

## External research

- LiteLLM (phase 2): `x-litellm-session-id` drives session affinity + spend grouping; `x-claude-code-session-id` groups Claude Code spend. Precedent for session-id-based grouping.
- OpenRouter: `X-OpenRouter-Title`/`HTTP-Referer` are app-level attribution; no session-level identity.
- FNV-1a: standard non-cryptographic hash (Fowler–Noll–Vo), used in hash tables and fingerprinting; 32-bit variant is the common default.

## Synthesis — design space

1. **Label taxonomy** (three tiers, all hash-only):
   - `identityLabel = fnv1a(uaClass|ipPrefix|sessionId)` — who (stable pseudo-identity).
   - `workloadLabel = fnv1a(uaClass|taskType)` — what kind of work.
   - `conversationLabel = conversationFingerprint(messages)` — which conversation (exists).
2. **Governance use:** identityLabel keys per-source rate limits and budgets; workloadLabel keys analytics; conversationLabel keys per-conversation limits and queue priority.
3. **Security note:** labels are *grouping keys*, not authentication. A determined client can vary its session id to get new labels — that's fine for analytics, useless against a real attacker. Gate levels L4 (key) / L5 (mTLS) exist for real identity.
4. **Storage:** labels in the SQLite usage tables (`src/lib/db/`), never the inputs. Add a `label` column to usage rows; the dashboard groups by it.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| FNV-1a is the right in-repo precedent for grouping labels | High |
| Hash-only persistence preserves the privacy stance | High |
| Labels are grouping keys, not authentication | High |
| Session-id headers are claims (post-auth trust) | High |

## Open questions

1. Should identityLabel include the *profile* name when one resolves (B6b2)? (Probably yes — profile is the strongest synthetic identity.)
2. 32-bit FNV-1a collision risk at scale — is 64-bit FNV-1a worth it for usage grouping? (Cheap to switch.)
3. Should conversationLabel TTL extend beyond 5 minutes for governance (e.g. per-conversation daily budget)?

## Sources

- Code: `open-sse/services/smartRouter.js` (conversationFingerprint, session stickiness — read in prior research)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md` (synthetic labels section)
- Industry: LiteLLM session-affinity docs (phase 2), FNV-1a (Fowler–Noll–Vo) standard