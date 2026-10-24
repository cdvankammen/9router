# KIRO-FIXES Cluster: Deep Research Report

**Date:** 2026-08-09
**Cluster PRs:** #3149, #3113, #3107, #3039, #3038, #2911, #2904, #2891
**Scope:** All open PRs targeting Kiro provider integration in 9Router

---

## Executive Summary

| Tier | PR | Title | Author | Risk | Mergeable? | Action |
|------|-----|-------|--------|------|------------|--------|
| **T1: Merge Now** | #2904 | fix(kiro): convert letter-dot-digit to letter-dash-digit in Claude model IDs | VitzS7 | LOW | ✅ Yes | Merge immediately — fixes #2308, no conflicts |
| **T1: Merge Now** | #3038 | fix(kiro): support API-key model discovery | ryanngit | LOW | ✅ Yes | Merge immediately — isolated service-layer fix |
| **T1: Merge Now** | #3039 | fix(kiro): canonicalize unsupported tool schemas | ryanngit | LOW | ✅ Likely | Merge after rebase check — clean translator concern |
| **T2: Minor Work** | #3107 | fix(kiro): restore normalized tool names | ryanngit | MEDIUM | ⚠️ Needs rebase | Touches chatCore.js + executor; verify against #3113 |
| **T2: Minor Work** | #3113 | fix(kiro): report real output tokens and stop discarding usable turns | nguyenha935 | MEDIUM | ⚠️ Needs review | Largest change (+491/-26); high value but complex |
| **T3: Needs Decision** | #2891 | fix(kiro): restore v0.5.20 payload and enable all effort levels | thienpvt | HIGH | ❌ Conflicts | Superseded by #2911? Major translator rewrite |
| **T3: Needs Decision** | #2911 | fix(kiro): drop top-level systemPrompt for kiro.dev gateway | jayll1303 | MEDIUM | ⚠️ Overlaps #2891 | Smaller alternative to #2891; pick one |
| **T4: Complex/Risky** | #3149 | fix(kiro): resolve broken MITM interception and stream decoding | rm1dev | HIGH | ⚠️ Verify | MITM layer changes; domain update needs validation |

### Key Findings

1. **#2891 and #2911 solve the same problem** (systemPrompt rejection on kiro.dev) with different approaches. #2911 is surgical (executor-level strip); #2891 is a full translator rewrite. **Recommend #2911 for now**, revisit #2891's session-replay removal separately.
2. **#3113 and #3107 both touch `open-sse/executors/kiro.js`** heavily. They address different defects but will conflict. Merge order matters: #3107 first (smaller), then rebase #3113.
3. **#2904, #3038, #3039 are independent** — no file overlaps with each other or the rest of the cluster. Safe to merge in any order.
4. **#3149 touches MITM infrastructure** (`src/mitm/`) which is architecturally separate from the translator/executor layer. Low cross-contamination risk but high domain-specific risk (Kiro IDE version coupling).

---

## Per-PR Detailed Analysis

### PR #2904 — fix(kiro): convert letter-dot-digit to letter-dash-digit in Claude model IDs
**Tier: T1 (Merge Now)**

| Field | Value |
|-------|-------|
| Author | VitzS7 |
| Files Changed | 3 (kiroConstants.js, claude-to-kiro.js, openai-to-kiro.js) |
| Lines | +29 / -2 |
| Fixes Issue | #2308 |

**Problem:** 9Router normalizes dashes to dots internally for registry lookup. When forwarding to Kiro upstream, `claude-sonnet-5` becomes `claude-sonnet.5`, which Kiro rejects with `INVALID_MODEL_ID`.

**Fix:** New `toKiroWireModelId()` in `kiroConstants.js` applies regex `/([a-z])\.(\d)/g → "$1-$2"` only to Claude model IDs.

**Risk:** LOW. Pure string transform. Non-Claude models pass through unchanged.
**Dependencies:** None. **Automerge:** YES.

---

### PR #3038 — fix(kiro): support API-key model discovery
**Tier: T1 (Merge Now)**

| Field | Value |
|-------|-------|
| Author | ryanngit |
| Files Changed | 3 (kiroModels.js, route.js, test) |
| Lines | +47 / -2 |
| Tests | 5 passed |

**Problem:** API-key connections validate OK but model discovery fails (missing TokenType header, wrong region, dropped maxOutputTokens).

**Fix:** Three targeted changes in `fetchKiroCatalogRaw()`.

**Risk:** LOW. Service-layer only. **Dependencies:** None. **Automerge:** YES.

---

### PR #3039 — fix(kiro): canonicalize unsupported tool schemas
**Tier: T1 (Merge Now)**

| Field | Value |
|-------|-------|
| Author | ryanngit |
| Files Changed | 2 (kiroConversation.js, test) |
| Lines | +161 / -7 |
| Tests | 86 passed, 2 expected failures |

**Problem:** Amazon Q rejects tool definitions containing JSON Schema composition keywords (oneOf, allOf, anyOf, $ref, $defs, if/then/else).

**Fix:** Recursive cleaning + root-level combinator flattening. Source tool declarations remain immutable.

**Risk:** LOW. Well-tested. **Dependencies:** None. **Automerge:** YES.

---

### PR #3107 — fix(kiro): restore normalized tool names
**Tier: T2 (Minor Work)**

| Field | Value |
|-------|-------|
| Author | ryanngit |
| Files Changed | 6 (kiro.js, chatCore.js, openai-to-kiro.js, kiro-to-openai.js, 2 tests) |
| Lines | +75 / -5 |
| Tests | 155 Kiro tests passed |

**Problem:** Tool name normalization is one-way; Kiro returns sanitized names that clients don't recognize.

**Fix:** Build reverse map (kiroName → originalName), thread through chatCore → executor → response translator.

**Conflict with #3113:** MODERATE. Both modify `emitTools()` in kiro.js. Merge #3107 FIRST.
**Risk:** MEDIUM. **User Decision:** No, but merge ordering matters.

---

### PR #3113 — fix(kiro): report real output tokens and stop discarding usable turns
**Tier: T2 (Minor Work)**

| Field | Value |
|-------|-------|
| Author | nguyenha935 |
| Files Changed | 5 (kiro.js, claude-to-kiro.js, openai-to-kiro.js, kiro-to-claude.js, test) |
| Lines | +491 / -26 |
| Tests | 13 new tests; 0 regressions |
| Supersedes | #3112 |

**5 defects fixed:**
- A: Tool-only turns report completion_tokens: 0/1
- B: Truncation kills usable output (model_context_window_exceeded)
- C: One bad tool kills all tools in a turn
- D: Cache tokens lost for Claude clients
- E: Invalid conversation could reach upstream silently

**Risk:** MEDIUM-HIGH due to size. Reshapes error handling from "fail fast" to "preserve usable output."
**User Decision:** Review philosophical shift in error handling.

---

### PR #2891 — fix(kiro): restore v0.5.20 payload and enable all effort levels
**Tier: T3 (Needs Decision)**

| Field | Value |
|-------|-------|
| Author | thienpvt |
| Files Changed | 8 |
| Lines | +160 / -193 |
| Fixes Issue | #2716 |

**⚠️ OVERLAP WITH #2911:** Both fix systemPrompt rejection. #2891 is comprehensive rewrite; #2911 is surgical strip.

**Key differences from #2911:**
- Removes session replay entirely
- Removes agentMode: "vibe" field
- Enables xhigh/max effort levels
- Changes golden snapshots

**Risk:** HIGH. Removes session continuity. **Decision Required:** Choose #2891 OR #2911.

---

### PR #2911 — fix(kiro): drop top-level systemPrompt for kiro.dev gateway
**Tier: T3 (Needs Decision)**

| Field | Value |
|-------|-------|
| Author | jayll1303 |
| Files Changed | 1 (kiro.js) |
| Lines | +16 / -1 |
| Tests | Manual E2E only |

**Fix:** Detect .kiro.dev URL and strip systemPrompt at wire level. Minimal and elegant.

**Risk:** MEDIUM. Uses fragile _currentTargetUrl instance state. Lacks automated tests.
**Decision Required:** Choose this OR #2891.

---

### PR #3149 — fix(kiro): resolve broken MITM interception and stream decoding
**Tier: T4 (Complex/Risky)**

| Field | Value |
|-------|-------|
| Author | rm1dev |
| Files Changed | 5 (config.js, kiro.js MITM, server.js, cliTools.js, test) |
| Lines | +67 / -15 |

**4 issues fixed:**
1. Broken request interception (Kiro IDE v1.0.228+ path change)
2. Stream decoding crashes (missing initial-response frame)
3. Agent/Vibe mode bypass (modelId: "auto")
4. Domain update to runtime.us-east-1.kiro.dev

**Risk:** HIGH. Tightly coupled to Kiro IDE version. No integration test.
**User Decision:** Verify against actual Kiro IDE v1.0.228+.

---

## Overlap & Dependency Map

```
#2904 (Model ID)     ← Independent, merge first
#3038 (API-key)      ← Independent, merge anytime
#3039 (Tool Schema)  ← Independent, merge anytime

#3107 (Tool Names) ◄──► #3113 (Tokens+Truncation)  CONFLICT on kiro.js
                         Merge #3107 first, rebase #3113

#2891 (Full Rewrite) ◄══► #2911 (Surgical Strip)   MUTUALLY EXCLUSIVE
                           Pick ONE for systemPrompt fix

#3149 (MITM Fix)     ← Independent layer, high verification burden
```

## Recommended Merge Order
1. #2904, #3038, #3039 (parallel, independent)
2. #3107 (before #3113)
3. #3113 (rebase on #3107)
4. #2911 OR #2891 (user decision)
5. #3149 (after MITM verification)
