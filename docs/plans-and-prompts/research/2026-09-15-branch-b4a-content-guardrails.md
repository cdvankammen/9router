# Branch Research — B4a: Content Guardrails (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #guardrails #pii #prompt-injection #binary-tree #branch-b4a

## Objective

Deep-dive the **content guardrails** subtree: PII redaction (B4a1) and prompt-injection detection (B4a2), down to L6 leaves.

```
B4a CONTENT GUARDRAILS
├─ B4a1: PII REDACTION
│  ├─ B4a1L: pattern-based (email, phone, SSN)
│  │  ├─ B4a1LL: regex redact
│  │  └─ B4a1LR: OpenRouter sensitive-info precedent
│  └─ B4a1R: entity-based (NER)
│     ├─ B4a1RL: model-based detection
│     └─ B4a1RR: cost/latency tradeoff
└─ B4a2: PROMPT-INJECTION DETECTION
   ├─ B4a2L: regex patterns
   │  ├─ B4a2LL: OpenRouter security guardrail
   │  └─ B4a2LR: jailbreak phrases
   └─ B4a2R: classifier-based
      ├─ B4a2RL: LLM-as-judge
      └─ B4a2RR: fail-open convention
```

## Codebase grounding

- No content guardrails exist in 9router today. The phase-1 plan (M5) proposed budgets, allowlists, regex content filters, and prompt-injection detection; this branch deep-dives the content-filtering half.
- The RTK token saver (`open-sse/rtk/`) already walks message content (tool_result blocks) — the plumbing for content inspection exists.

## External research

### B4a1LL — Regex redaction

- Pattern-based PII redaction: regexes for emails, phone numbers, SSNs, credit cards, API keys. Replace matches with `[REDACTED]` before the request leaves the gateway.
- Standard practice in LLM gateways (LiteLLM has `litellm_settings` redaction; OpenRouter has sensitive-info guardrails).
- Cost: O(n) per message, no deps (or a small regex library). Deterministic, testable.
- Risk: false positives (a "phone number" in a code sample) and false negatives (unstructured PII). Regex is a *first line*, not a complete solution.

### B4a1LR — OpenRouter sensitive-info precedent

- OpenRouter's sensitive-info guardrail (phase 2 research): detects and redacts sensitive info in requests. OpenRouter's guardrails are opt-in per key/workspace, applied before the request is forwarded.
- 9router implication: redaction should be **opt-in per profile** (a profile policy flag), applied at the gateway before dispatch.

### B4a1R — Entity-based (NER)

- **B4a1RL — model-based detection:** NER (named entity recognition) via a small local model or an LLM-as-judge call. Catches unstructured PII (names, addresses, orgs) that regex misses.
- **B4a1RR — cost/latency tradeoff:** NER adds latency (a model call per request) and cost. For a local gateway, this is a *premium* option — only for profiles that need it (e.g. a profile that handles customer data).

### B4a2L — Regex prompt-injection detection

- **B4a2LL — OpenRouter security guardrail:** OpenRouter's security guardrail detects prompt-injection attempts (phase 2 research). It's a regex/pattern-based filter for known injection patterns.
- **B4a2LR — jailbreak phrases:** patterns like "ignore previous instructions", "you are now DAN", "system prompt override", etc. A configurable blocklist of phrases + patterns.
- Cost: cheap, deterministic. Risk: bypassable by paraphrasing — it's a *deterrent*, not a defense.

### B4a2R — Classifier-based

- **B4a2RL — LLM-as-judge:** a classifier (local model or API call) scores the request for injection likelihood. Higher accuracy, higher cost/latency.
- **B4a2RR — fail-open convention:** the repo's RTK convention is fail-open (never throw out of hooks). Content guardrails should follow: if the classifier errors, **let the request through** (fail-open) rather than blocking legitimate traffic. Blocking on error is a DoS vector (an attacker can trigger the classifier error to block all traffic).

## Synthesis — design space

1. **Tiered content guardrails** (per-profile policy):
   - Tier 0 (default): no content inspection.
   - Tier 1 (cheap): regex PII redaction + regex injection detection. Zero-dep, deterministic.
   - Tier 2 (premium): NER-based PII + classifier-based injection detection. Model call per request.
2. **Fail-open convention:** all content guardrails fail open (errors → pass through). Log the failure for observability.
3. **Redaction placement:** before dispatch (in `chatCore.js` after translation, or in the app layer before translation). Redact *before* the request leaves the gateway; the response is not redacted (the model's output is the user's data).
4. **Injection detection placement:** on the *incoming* request (before translation). Block (403) or flag (log + continue) — configurable per profile.
5. **Dashboard:** per-profile guardrail stats (redactions count, injection flags, false-positive rate).

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Regex redaction is the right cheap first line | High |
| Fail-open is the right error convention (matches RTK) | High |
| NER/classifier tiers are premium options | High |
| OpenRouter's opt-in per-key guardrails are the right model | High |

## Open questions

1. Should redaction apply to tool_result content (the RTK saver's domain) or all message content?
2. Should injection detection block (403) or flag (log)? (Recommendation: flag by default, block opt-in.)
3. Is a local NER model feasible for 9router's zero-dep stance, or should Tier 2 use an API call?

## Sources

- Code: `open-sse/rtk/` (content-walking precedent), `open-sse/handlers/chatCore.js` (dispatch point)
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M5), `2026-09-14-keyless-governance-research.md`
- Industry: OpenRouter guardrails docs (phase 2 fetch), LiteLLM redaction settings