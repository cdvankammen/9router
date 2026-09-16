# Deep Research — Keyless Governance: Agent Profiles, Synthetic Source Tracking, Priority Queues, Gate Levels, Model-Group Limiting, Adaptive Rate Control

**Date:** 2026-09-14
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #keyless #profiles #queue #priority #gate-levels #model-groups #adaptive-rate #attribution

## Objective

The user wants to **control and gate requests without having to do it via API keys**, and to **track where messages come from programmatically and synthetically** with multiple options. Expanded asks:

1. **Keyless gating** — control/gather requests without API keys (profiles, workspaces, guardrails like OpenRouter, gate levels, programmatic tag selection).
2. **Agent profiles** — create named agent profiles as an alternative identity mechanism to API keys.
3. **Synthetic/programmatic source tracking** — multiple options to track where messages come from, including synthetic labels.
4. **Tag/keyword priority queues** — tags as groupings of keywords; prompts containing them get higher queue priority.
5. **Gate levels** — different gate levels (a ladder of identity confidence).
6. **Model-group limiting** — group models (e.g. 9 qwen models under one provider endpoint) and cap the group, queueing + interval pacing instead of burst.
7. **Adaptive/predictive rate control** — messages/s math over a minute/seconds; programmatically decide and change the rate based on incoming speed, not just a hard x/second rule.

This doc records ALL research: what exists in 9router, what the industry does (OpenRouter, Anthropic, LiteLLM, TCP congestion control, queueing theory), and the full design space. Companion plan: `../planning/2026-09-14-keyless-governance-plan.md`.

---

## Part A — Keyless gating: the full option space

### A.1 Why keyless?

- API keys are friction: every client needs config, rotation, sharing, and per-key management.
- Local gateway (9router runs on localhost:20128) means the "attacker" is usually a misbehaving agent, not a remote adversary — so identity can be softer.
- The user wants: profiles, workspaces, guardrails, gate levels, and programmatic tag selection as alternatives.

### A.2 The option space (10 mechanisms)

| # | Mechanism | Identity signal | Trust | Effort | Notes |
|---|-----------|----------------|-------|--------|-------|
| 1 | **Network gating** | IP, subnet, loopback, interface | Medium (spoofable on LAN) | Low | Already have per-IP limiter; add allow/deny lists, trusted-subnet bypass |
| 2 | **UA fingerprint gating** | `sourceApps.js` class | Low (spoofable) | Low | Already exists; use class as gate key |
| 3 | **Header identity** | `X-9R-App` / `X-9R-User` / `X-9R-Session` | Low unless post-auth or trusted net | Low | Trusted only after key auth OR from trusted subnet |
| 4 | **Agent profiles** | name + UA patterns + headers + IPs + policy | Medium | Medium | THE core concept — see Part B |
| 5 | **Workspaces** | workspace id (OpenRouter/Anthropic style) | Medium | Medium | Group profiles/keys under a workspace with shared budgets |
| 6 | **Guardrails** | policy objects (OpenRouter style) | n/a (policy, not identity) | Medium | Budgets, allowlists, content filters — see original research |
| 7 | **Gate levels** | ladder of identity confidence | n/a | Medium | See Part G |
| 8 | **Tag-based allowance** | keywords in prompt → tag → priority/allowance | Low (content-based) | Medium | See Part D |
| 9 | **Short-lived tokens** | minted from a profile, no static key | High | Medium | Profile → 5-min token; client sends token; no key rotation pain |
| 10 | **OAuth/device flow** | browser-based device authorization | High | High | Overkill for local gateway; listed for completeness |

### A.3 Keyless vs keyed — hybrid model

The realistic design is **hybrid**: keys remain for remote/scripted clients; profiles + gates cover local agents. Resolution order per request:

```
1. API key present?        → key identity (highest trust)
2. No key, trusted subnet? → profile by UA/header (medium trust)
3. No key, loopback?       → profile by UA/header (medium trust)
4. Otherwise               → default profile (lowest trust, strictest limits)
```

This mirrors LiteLLM's JWT-auth fallback ("the caller is the authenticated user id when the request carries no key") and OpenRouter's per-key guardrail layering.

---

## Part B — Agent profiles (the core new concept)

### B.1 What a profile is

A named identity bundle, persisted in SQLite, that replaces/augments API keys:

```js
{
  id: "prof_abc123",
  name: "hermes-main",            // human name
  app: "Claude Code",             // sourceApps class (optional)
  uaPatterns: [/hermes/i],        // extra UA regexes (optional)
  allowedHeaders: { "X-9R-User": "alice" },  // header match (optional)
  allowedIps: ["127.0.0.1", "192.168.1.*"],  // optional
  modelAllowlist: ["claude-*"],   // optional
  providerAllowlist: ["anthropic"], // optional
  rateLimits: { rpm: 60, tpm: 100000 },  // optional
  budget: { usd: 10, period: "monthly" }, // optional
  priority: 3,                    // queue priority class (0-5)
  tags: ["code", "fast"],         // tag groups this profile belongs to
  guardrails: { pii: "redact", promptInjection: "block" }, // optional
  gateLevel: 2,                   // minimum gate level to activate
  enabled: true
}
```

### B.2 Industry precedents

- **LiteLLM teams/users**: keys grouped under teams with shared budgets/limits; `user` field in requests; metadata on keys (`{"app": "claude-code", "user": "alice"}`).
- **Anthropic workspaces**: `wrkspc_`-prefixed IDs, per-workspace rate limits + spend limits, per-user keys minted at sign-in, keys stop working when owner removed.
- **OpenRouter guardrails**: member assignments (baseline for all their keys) + API key assignments (granular); workspace default guardrail.
- **OpenRouter BYOK filters**: `allowed_models`, `allowed_api_key_hashes`, `allowed_user_ids` — filters evaluated before routing.

### B.3 Profile resolution order

```
1. API key → key's profile (explicit)
2. X-9R-Profile header (post-auth or trusted net) → named profile
3. UA fingerprint + IP match → best-matching profile
4. Default profile
```

Profiles inherit from a **default profile** (like OpenRouter's workspace default guardrail): limits/budgets/allowlists cascade down, per-profile overrides win.

### B.4 Profile → routing

Profiles feed the existing smart router: `modelAllowlist` intersects smart-router candidates; `priority` feeds the queue; `tags` feed tag-based priority; `budget` feeds guardrails. This is the "profile/identity-based routing" feature from the original scope, now with a keyless identity source.

---

## Part C — Synthetic & programmatic source tracking (multiple options)

### C.1 The signal inventory

| Signal | Source | Existing? | Synthetic? |
|--------|--------|-----------|------------|
| UA fingerprint | `sourceApps.js` | ✅ | No |
| Client headers (`X-9R-App/User/Session`) | request | ❌ | No |
| Session id (`x-claude-code-session-id`, `x-litellm-session-id`, `metadata.session_id`) | request | Partial (conversationId) | No |
| Conversation fingerprint | smartRouter FNV-1a | ✅ | No |
| Task type | smartRouter classifyTask | ✅ | No |
| IP + port | socket | ✅ (rate limiter) | No |
| TLS fingerprint (JA3) | TLS handshake | ❌ | No |
| Request body metadata (`user`, `extra_body.metadata`) | request | Partial | No |
| **Synthetic source label** | derived | ❌ | ✅ |
| **Behavioral fingerprint** | derived | ❌ | ✅ |
| **Prompt-embedding cluster** | derived | ❌ | ✅ |

### C.2 Synthetic source labels (the "synthetically" ask)

A **synthetic source label** is a stable derived identifier that groups requests without any client cooperation:

- `syntheticSource = hash(uaClass + ipPrefix + sessionId)` — stable per (app, network, session).
- `syntheticSource = hash(uaClass + taskType)` — groups by usage pattern.
- **Behavioral fingerprint**: arrival-rate pattern, request-size distribution, tool-use frequency → cluster into "agents" (e.g. "fast-tool-user", "slow-chat"). This is how you can track "which hermes agent" without knowing the agent's name.
- **Prompt-embedding cluster**: embed first user message, cluster embeddings → "this cluster of prompts comes from the same workflow". Expensive; listed as future option.

### C.3 Why synthetic matters

The user said: *"a way that we can track and be able to handle the messages without needing to know specifically which hermes agent or place they are coming from."* Synthetic labels give you **stable grouping without identity cooperation** — you can rate-limit, prioritize, and attribute by behavior even when the client sends nothing identifiable.

### C.4 Privacy guardrails (existing convention)

Never persist raw UA; only the class. Same for synthetic labels: persist the hash, not the inputs. Document in the plan.

---

## Part D — Queue management with prioritization

### D.1 Priority queue models

| Model | Behavior | Use case |
|-------|----------|----------|
| **Strict priority** | Higher priority always dequeued first | Emergency/critical traffic |
| **Weighted fair queueing (WFQ)** | Each priority class gets a weight; dequeued proportionally | Balanced fairness |
| **Priority + aging** | Priority decays with wait time (starvation prevention) | Long-running agents |
| **Tag-based** | Prompt keywords → tag → priority class | The user's "tags as keyword groups" ask |

### D.2 Tag/keyword priority (the user's specific ask)

> "we could find different ways to programmatically choose tags that are allowed through (tags being keywords or we could make a tag as the name that we use and in reality it is a grouping of keywords that would allow prompts that have them in it higher priority in the queue)"

Design:

```js
// tag definition
{ name: "urgent", keywords: ["asap", "urgent", "production", "p0", "critical"], priority: 5 }
{ name: "code",   keywords: ["refactor", "debug", "implement", "fix"], priority: 3 }
{ name: "chat",   keywords: [], priority: 1 }  // default

// matching: scan last user message (string or content array) for keywords
// → highest-matching tag wins → priority class
```

- Reuses the smartRouter `classifyTask` scanning pattern (last user message, string or array content).
- Tags are **configurable in the UI** (add/remove keywords, set priority).
- A prompt matching multiple tags gets the **highest** priority (or configurable: sum/weighted).
- Tags can also gate **allowance** (not just priority): a tag can be "blocked" or "redacted" — this is the "programmatically choose tags that are allowed through" ask.

### D.3 Queue mechanics

- Bounded FIFO per (profile, priority-class); global cap.
- TTL per item (default 60s); expired → 429.
- Backpressure: when queue full → 503 + `Retry-After` (or 429).
- Head-of-line protection: per-profile fairness (a busy profile can't starve others).
- LiteLLM precedent: "Prioritizing important requests to ensure they don't fail (i.e. Queueing)".
- 9router precedent: combo engine already queues fallback attempts; smart router has session stickiness.

### D.4 Interval pacing (the "sent out in specific intervals" ask)

> "prevent calls to any of those models ... from being called more than x amount of times before it begins queuing them and making sure that the messages are sent out in specific intervals instead of a mass all at once"

- **Pacer**: a per-group token dispenser that releases N tokens per interval (e.g. 1 per 2s) instead of burst.
- **Smooth send**: queue drains at a configurable rate; burst requests are spread.
- This is the classic **leaky bucket** (fixed-rate drain) vs token bucket (burst-capable) distinction — the user explicitly wants leaky-bucket-style pacing for model groups.

---

## Part E — Model-group limiting (the "9 qwen models" ask)

### E.1 The problem

> "if we have 9 qwen models we would be able to group those together and prevent calls to any of those models (that are within the full provider endpoint) not be called more than x amount of times before it begins queuing them"

A provider endpoint (e.g. one qwen API key/base URL) has a **shared upstream rate limit** across all its models. 9router currently limits per-IP, not per-model-group — so 9 qwen models can collectively hammer one upstream key.

### E.2 Design: model groups

```js
// model group definition
{ id: "qwen-family", provider: "qwen", models: ["qwen-max", "qwen-plus", ...], 
  rpm: 30, tpm: 200000, pacing: { intervalMs: 2000, burst: 2 } }
```

- **Group membership**: by provider + family prefix (`qwen-*`), or explicit list, or combo membership.
- **Group budget**: shared RPM/TPM across all member models; enforced before dispatch.
- **Group queue**: when group budget exhausted → queue with interval pacing (Part D.4).
- **Group cooldown**: on upstream 429 → cooldown the whole group (LiteLLM precedent: cooldown per deployment; here per group).
- **Group observability**: `model_group` recorded in usage (LiteLLM precedent: `model_group` in spend logs, `attempted_fallbacks`, `original_model_group`).

### E.3 Industry precedents

- **LiteLLM routing groups**: bind a list of `model_name`s to a strategy; group callable as a model; `model_group` in spend logs; per-group strategy args (TTL, TPM ceilings).
- **LiteLLM max parallel requests**: semaphore per deployment; default derived from RPM (RPM or tpm/1000/6).
- **LiteLLM cooldowns**: 429 → immediate 5s cooldown; >50% failure rate → 5s; per-deployment `allowed_fails_policy`.
- **Anthropic**: per-model RPM/ITPM/OTPM token buckets, workspace-level caps.
- **9router combos**: existing grouping mechanism (a combo is a list of models with fallback) — model groups can reuse combo membership.

### E.4 Group vs combo distinction

- **Combo** = ordered fallback list (try A, then B).
- **Model group** = shared-budget pool (A and B share a cap, paced together).
- They compose: a combo's members can belong to a model group; the group cap applies before combo fallback logic.

---

## Part F — Adaptive/predictive rate control

### F.1 The ask

> "predictive amounts in the queue where it is seeing a specific number of requests coming in and we can make it so that it can automatically deal with the loads doing a messages/s kind of math and being able to over the course of a minute or number of seconds figure out how many to let through to prevent it from hitting that. so it can do more than just a hard set rule of x/second get sent it can programmatically decide and change its rate depending on the speed at which things are getting sent"

### F.2 Algorithm inventory

| Algorithm | Behavior | Adaptive? |
|-----------|----------|-----------|
| **Token bucket** | Fixed refill rate, burst capacity | No (static) |
| **Leaky bucket** | Fixed drain rate | No (static) |
| **Sliding window** | Count in window, reject over limit | No (static) |
| **AIMD** (TCP congestion control) | Additive increase, multiplicative decrease on signal | ✅ |
| **EWMA arrival-rate tracking** | Exponential moving average of incoming rate → predict next window | ✅ |
| **Budget-proportional pacing** | allowed = min(limit, remaining_budget / remaining_time) | ✅ |
| **Feedback-driven** (429 cooldown) | On upstream 429, reduce rate; on success, slowly increase | ✅ |
| **Concurrency-based** | Max parallel requests (semaphore); adapt concurrency on latency | ✅ |

### F.3 Recommended hybrid: AIMD + EWMA + feedback

```
Per model-group:
  base_rate = configured rpm (static floor)
  current_rate = base_rate
  On each window (e.g. 5s):
    incoming = EWMA(arrival rate over last N windows)
    if incoming > current_rate * 1.2:   # surge detected
      current_rate = max(floor, current_rate * 0.7)   # multiplicative decrease
    elif no 429s and incoming < current_rate * 0.8:
      current_rate = min(cap, current_rate + step)    # additive increase
  On upstream 429:
    current_rate *= 0.5; cooldown group 5s (LiteLLM precedent)
  On success streak (e.g. 60s no 429):
    current_rate += step (slow recovery)
```

- **Predictive**: EWMA of arrival rate lets the system *anticipate* a surge and pre-throttle instead of reacting to 429s.
- **Budget-proportional**: if a monthly budget is set, allowed rate = remaining_budget / remaining_seconds — the "messages/s math over a minute" ask.
- **UI**: expose current_rate, incoming rate, 429 count per group — the "control the current limits per provider" ask.

### F.4 Industry precedents

- LiteLLM: rate-limit-aware routing strategy (RPM/TPM aware), cooldowns, max parallel requests.
- TCP congestion control (AIMD) — the canonical adaptive rate algorithm.
- Anthropic: token bucket with continuous refill; 429 + `retry-after-ms`; SDK exponential backoff.
- OpenRouter: provider-level rate management on shared capacity.

---

## Part G — Gate levels (the "different gates levels" ask)

### G.1 The ladder

A **gate level** is a minimum identity-confidence threshold a request must clear. Each level unlocks more privileges (higher limits, more models, queue priority).

| Level | Identity required | Example | Privileges |
|-------|-------------------|---------|------------|
| L0 | None | curl from loopback | Default limits, default models |
| L1 | UA fingerprint | Claude Code UA | App-class limits |
| L2 | Header identity (post-auth or trusted net) | `X-9R-App: hermes` | Profile limits |
| L3 | Profile match (UA+IP+headers) | hermes profile | Profile models/priority |
| L4 | API key | sk-... | Key limits/budget |
| L5 | mTLS / client cert | cert | Full privileges |

### G.2 Gate config

```js
// per-profile or global
{ gateLevel: 2,  // minimum level to activate this profile
  gates: {
    L0: { rpm: 10, models: ["default"] },
    L1: { rpm: 30, models: ["default", "qwen-*"] },
    L2: { rpm: 60, models: ["*"], priority: 2 },
    L3: { rpm: 120, models: ["*"], priority: 4, budget: {usd: 10, period: "monthly"} }
  } }
```

- A request is evaluated up the ladder; the highest level it clears determines its policy.
- **UI**: gate-level editor per profile; live "current gate" indicator per request in usage view.

### G.3 Why gates

The user's "different gates levels" maps to: *"we could develop different gates levels"* — a structured way to say "this traffic is more trusted than that traffic" without keys. Gates compose with profiles (a profile has a minimum gate level) and with guardrails (a guardrail can require a gate level).

---

## Part H — Synthesis: the "9router Governance" architecture

### H.1 Layered model

```
┌─────────────────────────────────────────────────┐
│ 1. IDENTITY LAYER                                │
│    API key → profile → header → UA → IP → default│
│    (agent profiles, workspaces, synthetic labels)│
├─────────────────────────────────────────────────┤
│ 2. GATE LAYER                                    │
│    L0..L5 ladder; request clears highest level   │
├─────────────────────────────────────────────────┤
│ 3. POLICY LAYER (guardrails)                     │
│    budgets, model/provider allowlists, content   │
│    filters, PII, prompt-injection                │
├─────────────────────────────────────────────────┤
│ 4. QUEUE LAYER                                   │
│    priority classes (tags/keywords), WFQ, aging, │
│    TTL, backpressure, interval pacing            │
├─────────────────────────────────────────────────┤
│ 5. RATE LAYER                                    │
│    per-key/per-profile/per-app/per-model-group   │
│    token buckets + AIMD/EWMA adaptive control    │
├─────────────────────────────────────────────────┤
│ 6. ROUTING LAYER (existing)                      │
│    smart router (task classify + score), combos, │
│    fallback, multi-account                       │
├─────────────────────────────────────────────────┤
│ 7. OBSERVABILITY LAYER (existing + new)          │
│    usageDb, attribution (key/profile/app/user/   │
│    synthetic source), Sources view, queue depth  │
└─────────────────────────────────────────────────┘
```

### H.2 How it answers the two questions

- **"Where do my messages come from?"** — Identity layer + synthetic labels + observability: every request attributed to key/profile/app/user/synthetic-source/task.
- **"Where do my messages go?"** — Policy + queue + rate + routing layers: you control per-profile/per-group where and how fast messages flow, with guardrails and budgets.

### H.3 Keyless-first principle

The design makes **profiles + gates the default** for local traffic (loopback/trusted subnet), with API keys as an optional higher-trust tier. This directly answers "control and gate requests easier without having to do it via API keys."

---

## Part I — Sources consulted

- 9router codebase: `src/lib/sourceApps.js`, `open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `custom-server.rate-limiter.js`, `src/lib/usageDb.js`, `src/lib/db/`, `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md`
- LiteLLM: routing/load-balancing docs (routing groups, session affinity, max parallel, cooldowns, retries, weighted failover, pre-call checks), reliability docs (fallbacks, enforce_fallback_model_access, spend-log fallback tracking)
- OpenRouter: BYOK docs (key priority, filters, management API, ZDR/region declarations, include_byok_in_budgets), guardrails docs, app attribution docs
- Anthropic: rate limits (token bucket, RPM/ITPM/OTPM, workspace caps), workspaces, authentication (personal/service/workspace keys, WIF, App Attest)
- TCP congestion control (AIMD) — canonical adaptive rate algorithm
- Queueing theory: strict priority, WFQ, priority aging, leaky vs token bucket

## Part J — Open questions & confidence

- **Confidence: high** on LiteLLM routing groups/cooldowns/session affinity (official docs).
- **Confidence: high** on OpenRouter BYOK filters/management API (official docs).
- **Confidence: high** on the 9router codebase inventory (read directly).
- **Open:** whether the user wants profiles to fully replace keys for local traffic, or coexist (recommended: coexist, keyless-first for loopback).
- **Open:** whether synthetic labels should be persisted (privacy) or derived on the fly.
- **Open:** whether tag priority should be highest-match or weighted-sum.
- **Open:** whether model groups should be auto-derived (provider+family prefix) or explicit.
- **Open:** whether adaptive rate control should be per-model-group only, or also per-profile.
- **Open:** whether gate levels should be a global ladder or per-profile configurable.