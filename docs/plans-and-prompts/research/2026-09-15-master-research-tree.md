# Master Research Tree — 9router Governance & Control (6-Level Binary Tree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** complete (all 16 branch docs written)
**Tags:** #research #index #tree #governance #binary-tree

## Purpose

This is the master map for the expanded research effort: every topic from the two prior research docs (`2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md`) is expanded into a **6-level binary tree** (63 nodes). Each Level-3 branch has its own research doc covering its 7-node subtree.

## Status

All 16 Level-3 branches researched and documented (2026-09-15). Each branch doc covers its full 7-node subtree (L3 → L6 leaves) with codebase grounding, external research, synthesis, confidence levels, and open questions.

## The Tree

```
L0  ROOT: 9router Governance & Control
│
├─ L1 A: SOURCE / IDENTITY — where messages come from
│  ├─ L2 A1: PASSIVE TRACKING
│  │  ├─ L3 A1a: UA FINGERPRINTING
│  │  │  ├─ L4 A1a1: sourceApps.js rule engine
│  │  │  │  ├─ L5 A1a1L: rule ordering & specificity
│  │  │  │  │  ├─ L6 A1a1LL: regex precedence (most-specific-first)
│  │  │  │  │  └─ L6 A1a1LR: fallback to DEFAULT_APP
│  │  │  │  └─ L5 A1a1R: rule extensibility (addSourceAppRule)
│  │  │  │     ├─ L6 A1a1RL: test-driven rule addition
│  │  │  │     └─ L6 A1a1RR: UA cap at 300 chars
│  │  │  └─ L4 A1a2: UA SPOOFING DETECTION
│  │  │     ├─ L5 A1a2L: UA consistency checks
│  │  │     │  ├─ L6 A1a2LL: UA vs header cross-check
│  │  │     │  └─ L6 A1a2LR: UA vs behavior cross-check
│  │  │     └─ L5 A1a2R: TLS fingerprinting (JA3/JA4)
│  │  │        ├─ L6 A1a2RL: JA3 hash of TLS handshake
│  │  │        └─ L6 A1a2RR: JA4 (post-QUIC era)
│  │  └─ L3 A1b: HEADER / NETWORK IDENTITY
│  │     ├─ L4 A1b1: CLIENT IDENTITY HEADERS
│  │     │  ├─ L5 A1b1L: X-9R-App / X-9R-User / X-9R-Session
│  │     │  │  ├─ L6 A1b1LL: trust model (post-auth only)
│  │     │  │  └─ L6 A1b1LR: validation against known apps
│  │     │  └─ L5 A1b1R: industry headers (OpenRouter, LiteLLM)
│  │     │     ├─ L6 A1b1RL: HTTP-Referer + X-OpenRouter-Title
│  │     │     └─ L6 A1b1RR: x-litellm-session-id, x-claude-code-session-id
│  │     └─ L4 A1b2: IP / SUBNET TRUST
│  │        ├─ L5 A1b2L: loopback & trusted-subnet bypass
│  │        │  ├─ L6 A1b2LL: existing LOOPBACK set in rate-limiter
│  │        │  └─ L6 A1b2LR: custom-server X-Forwarded-For stripping
│  │        └─ L5 A1b2R: network gating (allow/deny lists)
│  │           ├─ L6 A1b2RL: per-subnet profiles
│  │           └─ L6 A1b2RR: mTLS / client certs (L5 gate)
│  ├─ L2 A2: SYNTHETIC TRACKING
│  │  ├─ L3 A2a: SYNTHETIC LABELS
│  │  │  ├─ L4 A2a1: STABLE DERIVED LABELS
│  │  │  │  ├─ L5 A2a1L: hash(uaClass + ipPrefix + sessionId)
│  │  │  │  │  ├─ L6 A2a1LL: FNV-1a (smartRouter precedent)
│  │  │  │  │  └─ L6 A2a1LR: privacy (hash only, never inputs)
│  │  │  │  └─ L5 A2a1R: hash(uaClass + taskType)
│  │  │  │     ├─ L6 A2a1RL: usage-pattern grouping
│  │  │  │     └─ L6 A2a1RR: stability across sessions
│  │  │  └─ L4 A2a2: SESSION FINGERPRINTS
│  │  │     ├─ L5 A2a2L: conversationFingerprint (FNV-1a, 5-min TTL)
│  │  │     │  ├─ L6 A2a2LL: first system/user messages
│  │  │     │  └─ L6 A2a2LR: sticky-session reuse
│  │  │     └─ L5 A2a2R: session-id headers (client-supplied)
│  │  │        ├─ L6 A2a2RL: x-claude-code-session-id
│  │  │        └─ L6 A2a2RR: metadata.session_id in body
│  │  └─ L3 A2b: BEHAVIORAL FINGERPRINTS
│  │     ├─ L4 A2b1: ARRIVAL-RATE CLUSTERING
│  │     │  ├─ L5 A2b1L: request-size distribution
│  │     │  │  ├─ L6 A2b1LL: token-count histogram
│  │     │  │  └─ L6 A2b1LR: burst-pattern detection
│  │     │  └─ L5 A2b1R: inter-arrival time clustering
│  │     │     ├─ L6 A2b1RL: EWMA of arrival rate
│  │     │     └─ L6 A2b1RR: k-means / DBSCAN clustering
│  │     └─ L4 A2b2: TOOL-USE PATTERNS
│  │        ├─ L5 A2b2L: tool-call frequency
│  │        │  ├─ L6 A2b2LL: tool_use block counting
│  │        │  └─ L6 A2b2LR: tool-result size
│  │        └─ L5 A2b2R: task-type distribution
│  │           ├─ L6 A2b2RL: classifyTask histogram
│  │           └─ L6 A2b2RR: "fast-tool-user" vs "slow-chat" clusters
│  └─ (A3 would be prompt-embedding clustering — future, out of tree)
│
└─ L1 B: DESTINATION / CONTROL — where messages go
   ├─ L2 B1: RATE LIMITING
   │  ├─ L3 B1a: STATIC LIMITS
   │  │  ├─ L4 B1a1: TOKEN BUCKET
   │  │  │  ├─ L5 B1a1L: algorithm (refill rate + burst capacity)
   │  │  │  │  ├─ L6 B1a1LL: Anthropic RPM/ITPM/OTPM model
   │  │  │  │  └─ L6 B1a1LR: continuous refill semantics
   │  │  │  └─ L5 B1a1R: implementations
   │  │  │     ├─ L6 B1a1RL: in-memory (zero-dep, custom-server)
   │  │  │     └─ L6 B1a1RR: Redis / GCRA (distributed)
   │  │  └─ L4 B1a2: SLIDING WINDOW
   │  │     ├─ L5 B1a2L: fixed-window counter
   │  │     │  ├─ L6 B1a2LL: current limiter (60s window)
   │  │     │  └─ L6 B1a2LR: boundary burst problem
   │  │     └─ L5 B1a2R: sliding-window log / counter
   │  │        ├─ L6 B1a2RL: exact log (memory-heavy)
   │  │        └─ L6 B1a2RR: approximate counter (Redis ZSET)
   │  ├─ L3 B1b: ADAPTIVE CONTROL
   │  │  ├─ L4 B1b1: AIMD (TCP congestion control)
   │  │  │  ├─ L5 B1b1L: additive increase / multiplicative decrease
   │  │  │  │  ├─ L6 B1b1LL: TCP Reno semantics
   │  │  │  │  └─ L6 B1b1LR: CUBIC (Linux default)
   │  │  │  └─ L5 B1b1R: application to LLM gateways
   │  │  │     ├─ L6 B1b1RL: 429 as congestion signal
   │  │  │     └─ L6 B1b1RR: cooldown on failure (LiteLLM)
   │  │  └─ L4 B1b2: EWMA PREDICTION
   │  │     ├─ L5 B1b2L: exponential moving average of arrival rate
   │  │     │  ├─ L6 B1b2LL: surge detection (incoming > rate*1.2)
   │  │     │  └─ L6 B1b2LR: pre-throttle before 429s
   │  │     └─ L5 B1b2R: budget-proportional pacing
   │  │        ├─ L6 B1b2RL: allowed = remaining_budget / remaining_time
   │  │        └─ L6 B1b2RR: monthly-budget-aware rate
   │  └─ (B1c: concurrency-based — max parallel, semaphore)
   │
   ├─ L2 B2: QUEUE MANAGEMENT
   │  ├─ L3 B2a: PRIORITY QUEUES
   │  │  ├─ L4 B2a1: STRICT PRIORITY
   │  │  │  ├─ L5 B2a1L: highest-priority-first dequeue
   │  │  │  │  ├─ L6 B2a1LL: emergency/critical traffic
   │  │  │  │  └─ L6 B2a1LR: starvation risk
   │  │  │  └─ L5 B2a1R: tag/keyword → priority mapping
   │  │  │     ├─ L6 B2a1RL: keyword scan of last user message
   │  │  │     └─ L6 B2a1RR: highest-match wins
   │  │  └─ L4 B2a2: WFQ + AGING
   │  │     ├─ L5 B2a2L: weighted fair queueing
   │  │     │  ├─ L6 B2a2LL: proportional dequeue by weight
   │  │     │  └─ L6 B2a2LR: per-profile fairness
   │  │     └─ L5 B2a2R: priority aging
   │  │        ├─ L6 B2a2RL: priority decays with wait time
   │  │        └─ L6 B2a2RR: starvation prevention
   │  └─ L3 B2b: INTERVAL PACING
   │     ├─ L4 B2b1: LEAKY BUCKET DRAIN
   │     │  ├─ L5 B2b1L: fixed-rate drain
   │     │  │  ├─ L6 B2b1LL: 1 per 2s pacing
   │     │  │  └─ L6 B2b1LR: burst smoothing
   │     │  └─ L5 B2b1R: token dispenser
   │     │     ├─ L6 B2b1RL: N tokens per interval
   │     │     └─ L6 B2b1RR: queue drains at configurable rate
   │     └─ L4 B2b2: BACKPRESSURE
   │        ├─ L5 B2b2L: bounded queue + TTL
   │        │  ├─ L6 B2b2LL: 503 + Retry-After when full
   │        │  └─ L6 B2b2LR: TTL expiry → 429
   │        └─ L5 B2b2R: head-of-line protection
   │           ├─ L6 B2b2RL: per-profile fairness
   │           └─ L6 B2b2RR: busy profile can't starve others
   │
   ├─ L2 B3: MODEL-GROUP LIMITING
   │  ├─ L3 B3a: GROUP DEFINITIONS
   │  │  ├─ L4 B3a1: membership (provider + family prefix)
   │  │  │  ├─ L5 B3a1L: qwen-* auto-derive
   │  │  │  │  ├─ L6 B3a1LL: explicit opt-in
   │  │  │  │  └─ L6 B3a1LR: prefix confirmation
   │  │  │  └─ L5 B3a1R: explicit list / combo membership
   │  │  │     ├─ L6 B3a1RL: reuse combo engine
   │  │  │     └─ L6 B3a1RR: LiteLLM routing groups precedent
   │  │  └─ L4 B3a2: shared budget (RPM/TPM)
   │  │     ├─ L5 B3a2L: group cap before dispatch
   │  │     │  ├─ L6 B3a2LL: 9 qwen models share one cap
   │  │     │  └─ L6 B3a2LR: group queue + pacing
   │  │     └─ L5 B3a2R: group cooldown on 429
   │  │        ├─ L6 B3a2RL: 5s default (LiteLLM)
   │  │        └─ L6 B3a2RR: configurable
   │  └─ L3 B3b: GROUP OBSERVABILITY
   │     ├─ L4 B3b1: model_group in usage
   │     │  ├─ L5 B3b1L: LiteLLM spend-log precedent
   │     │  │  ├─ L6 B3b1LL: attempted_fallbacks + original_model_group
   │     │  │  └─ L6 B3b1LR: distinguish fallback-served
   │     │  └─ L5 B3b1R: dashboard per-group throughput
   │     │     ├─ L6 B3b1RL: live usage view
   │     │     └─ L6 B3b1RR: queue depth per group
   │     └─ L4 B3b2: group vs combo distinction
   │        ├─ L5 B3b2L: combo = ordered fallback list
   │        │  ├─ L6 B3b2LL: try A then B
   │        │  └─ L6 B3b2LR: existing engine
   │        └─ L5 B3b2R: group = shared-budget pool
   │           ├─ L6 B3b2RL: A and B share cap
   │           └─ L6 B3b2RR: compose (combo members in group)
   │
   ├─ L2 B4: GUARDRAILS
   │  ├─ L3 B4a: CONTENT GUARDRAILS
   │  │  ├─ L4 B4a1: PII REDACTION
   │  │  │  ├─ L5 B4a1L: pattern-based (email, phone, SSN)
   │  │  │  │  ├─ L6 B4a1LL: regex redact
   │  │  │  │  └─ L6 B4a1LR: OpenRouter sensitive-info precedent
   │  │  │  └─ L5 B4a1R: entity-based (NER)
   │  │  │     ├─ L6 B4a1RL: model-based detection
   │  │  │     └─ L6 B4a1RR: cost/latency tradeoff
   │  │  └─ L4 B4a2: PROMPT-INJECTION DETECTION
   │  │     ├─ L5 B4a2L: regex patterns
   │  │     │  ├─ L6 B4a2LL: OpenRouter security guardrail
   │  │     │  └─ L6 B4a2LR: jailbreak phrases
   │  │     └─ L5 B4a2R: classifier-based
   │  │        ├─ L6 B4a2RL: LLM-as-judge
   │  │        └─ L6 B4a2RR: fail-open convention
   │  └─ L3 B4b: BUDGET GUARDRAILS
   │     ├─ L4 B4b1: USD BUDGETS
   │     │  ├─ L5 B4b1L: daily/weekly/monthly reset
   │     │  │  ├─ L6 B4b1LL: OpenRouter guardrail budgets
   │     │  │  └─ L6 B4b1LR: include_byok_in_budgets
   │     │  └─ L5 B4b1R: soft/hard limits
   │     │     ├─ L6 B4b1RL: warning header
   │     │     └─ L6 B4b1RR: 403 block
   │     └─ L4 B4b2: ALLOWLISTS
   │        ├─ L5 B4b2L: model allowlist
   │        │  ├─ L6 B4b2LL: intersection (key ∩ global)
   │        │  └─ L6 B4b2LR: wildcard support
   │        └─ L5 B4b2R: provider allowlist
   │           ├─ L6 B4b2RL: OpenRouter provider allowlist
   │           └─ L6 B4b2RR: LiteLLM access groups
   │
   ├─ L2 B5: CREDENTIALS
   │  ├─ L3 B5a: KEY LIFECYCLE
   │  │  ├─ L4 B5a1: ROTATION
   │  │  │  ├─ L5 B5a1L: regenerate with grace period
   │  │  │  │  ├─ L6 B5a1LL: old key valid during grace
   │  │  │  │  └─ L6 B5a1LR: LiteLLM key regeneration
   │  │  │  └─ L5 B5a1R: expiry presets
   │  │  │     ├─ L6 B5a1RL: 3h/1d/7d/30d/custom (Anthropic)
   │  │  │     └─ L6 B5a1RR: expired → 401
   │  │  └─ L4 B5a2: DISABLE / ARCHIVE
   │  │     ├─ L5 B5a2L: disable (immediate)
   │  │     │  ├─ L6 B5a2LL: 401 on disabled
   │  │     │  └─ L6 B5a2LR: keep usage history
   │  │     └─ L5 B5a2R: archive (soft delete)
   │  │        ├─ L6 B5a2RL: audit trail
   │  │        └─ L6 B5a2RR: restore path
   │  └─ L3 B5b: ALTERNATIVE AUTH
   │     ├─ L4 B5b1: SHORT-LIVED TOKENS
   │     │  ├─ L5 B5b1L: profile → 5-min token
   │     │  │  ├─ L6 B5b1LL: no static key rotation
   │     │  │  └─ L6 B5b1LR: WIF precedent (Anthropic)
   │     │  └─ L5 B5b1R: device attestation
   │     │     ├─ L6 B5b1RL: App Attest (iOS/macOS)
   │     │     └─ L6 B5b1RR: WebAuthn
   │     └─ L4 B5b2: OAUTH / DEVICE FLOW
   │        ├─ L5 B5b2L: device authorization grant
   │        │  ├─ L6 B5b2LL: browser-based approval
   │        │  └─ L6 B5b2LR: overkill for local gateway
   │        └─ L5 B5b2R: existing 9router OAuth
   │           ├─ L6 B5b2RL: provider OAuth + token refresh
   │           └─ L6 B5b2RR: reuse for profile auth
   │
   └─ L2 B6: AGENT IDENTITY
      ├─ L3 B6a: COOPERATIVE IDENTITY
      │  ├─ L4 B6a1: CLIENT-SUPPLIED HEADERS
      │  │  ├─ L5 B6a1L: X-9R-App (validated)
      │  │  │  ├─ L6 B6a1LL: known-app list
      │  │  │  └─ L6 B6a1LR: unknown → unknown
      │  │  └─ L5 B6a1R: OpenRouter app attribution
      │  │     ├─ L6 B6a1RL: HTTP-Referer + X-OpenRouter-Title
      │  │     └─ L6 B6a1RR: X-OpenRouter-Categories
      │  └─ L4 B6a2: AGENT CONFIG INTEGRATION
      │     ├─ L5 B6a2L: Claude Code settings
      │     │  ├─ L6 B6a2LL: ~/.claude/settings.json env
      │     │  └─ L6 B6a2LR: ANTHROPIC_BASE_URL pattern
      │     └─ L5 B6a2R: MCP client info
      │        ├─ L6 B6a2RL: JSON-RPC layer identity
      │        └─ L6 B6a2RR: no standard HTTP identity
      └─ L3 B6b: BEHAVIORAL IDENTITY
         ├─ L4 B6b1: GATE LEVELS (L0–L5)
         │  ├─ L5 B6b1L: ladder definition
         │  │  ├─ L6 B6b1LL: L0 none → L5 mTLS
         │  │  └─ L6 B6b1LR: per-level privileges
         │  └─ L5 B6b1R: gate evaluation
         │     ├─ L6 B6b1RL: highest cleared level wins
         │     └─ L6 B6b1RR: per-profile gate config
         └─ L4 B6b2: PROFILES
            ├─ L5 B6b2L: identity bundle
            │  ├─ L6 B6b2LL: name + app + UA + IP + headers
            │  └─ L6 B6b2LR: policy (limits/models/priority)
            └─ L5 B6b2R: resolution order
               ├─ L6 B6b2RL: key → header → UA+IP → default
               └─ L6 B6b2RR: LiteLLM JWT fallback precedent
```

## Branch docs (one per Level-3 node, covering its 7-node subtree)

| Branch | Doc |
|--------|-----|
| A1a UA fingerprinting | `2026-09-15-branch-a1a-ua-fingerprinting.md` ✅ |
| A1b Header/network identity | `2026-09-15-branch-a1b-header-network-identity.md` ✅ |
| A2a Synthetic labels | `2026-09-15-branch-a2a-synthetic-labels.md` ✅ |
| A2b Behavioral fingerprints | `2026-09-15-branch-a2b-behavioral-fingerprints.md` ✅ |
| B1a Static limits | `2026-09-15-branch-b1a-static-rate-limits.md` ✅ |
| B1b Adaptive control | `2026-09-15-branch-b1b-adaptive-rate-control.md` ✅ |
| B2a Priority queues | `2026-09-15-branch-b2a-priority-queues.md` ✅ |
| B2b Interval pacing | `2026-09-15-branch-b2b-interval-pacing.md` ✅ |
| B3a Group definitions | `2026-09-15-branch-b3a-model-group-definitions.md` ✅ |
| B3b Group observability | `2026-09-15-branch-b3b-model-group-observability.md` ✅ |
| B4a Content guardrails | `2026-09-15-branch-b4a-content-guardrails.md` ✅ |
| B4b Budget guardrails | `2026-09-15-branch-b4b-budget-guardrails.md` ✅ |
| B5a Key lifecycle | `2026-09-15-branch-b5a-key-lifecycle.md` ✅ |
| B5b Alternative auth | `2026-09-15-branch-b5b-alternative-auth.md` ✅ |
| B6a Cooperative identity | `2026-09-15-branch-b6a-cooperative-identity.md` ✅ |
| B6b Behavioral identity | `2026-09-15-branch-b6b-behavioral-identity.md` ✅ |

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md`
- Industry: OpenRouter, Anthropic, LiteLLM, MCP, TCP congestion control, queueing theory