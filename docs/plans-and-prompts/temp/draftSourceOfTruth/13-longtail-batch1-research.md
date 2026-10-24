# Long-Tail Batch 1 — Deep Research

**Date:** 2026-08-13
**PRs:** #3143, #3137, #3111, #3089, #3088
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3088** | fix(kimi): route API-key auth to platform endpoint | thatssoheil | 4 | LOW | T1 | ✅ **Merge now.** Fixes #2881 — platform keys rejected 401. |
| **#3089** | fix(gemini): strip stray value key at schema nodes | thatssoheil | 2 | LOW | T1 | ✅ **Merge now.** Fixes #2902. Depends on #3082 walker. |
| **#3137** | fix(vertex): validate RSA-2048 for SA private key | jayeliu | 3 | LOW | T1 | ✅ **Merge now.** Turns cryptic jose error into clear validation. |
| **#3111** | feat(telemetry): model + kiro credits + session id in DONE line | s3rli | 5 | LOW | T1 | ✅ **Merge now.** Enables per-model log dashboards. |
| **#3143** | fix(cli): don't kill config subcommand processes | kkunkunya | 23 | MED | T2 | ⚠️ **Kitchen sink PR** — 11 commits, 23 files. Title fix is small but PR bundles many features. |

---

## Per-PR Analysis

### PR #3088 — fix(kimi): route API-key auth to platform endpoint, not Kimi Code
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 4 (kimi.js registry, executor, tests) |
| Closes | #2881 |
| Risk | LOW |

**Problem:** Kimi API-key connections route to `api.kimi.com/coding/` (Kimi Code endpoint) instead of `platform.kimi.ai` — valid platform keys rejected with 401.

**Fix:** Adds `openai-apikey` transport to kimi registry, selects by authType at runtime, uses platform usage URL for apikey auth. The platform API (api.moonshot.cn) is OpenAI-compatible only, so Claude-format clients are translated to OpenAI too. Self-review fixed: removed dead `claude-apikey` transport; claude/openai-responses source formats map to `openai-apikey` transport.

**Risk:** LOW. Registry/transport selection change. Test added for claude-format clients.
**Verdict: MERGE NOW.**

---

### PR #3089 — fix(gemini): strip stray value key at schema nodes
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 2 |
| Closes | #2902 |
| Depends on | #3082 (schema-node walker) |
| Risk | LOW |

**Problem:** Gemini Provider returns `Invalid value at ... 'value', "object"` — stray non-schema `value` key (e.g. `value: "object"`) at schema nodes.

**Fix:** Strips stray `value` key at real schema nodes while keeping legitimate user parameters named 'value'. Uses #3082's walker (name-map keys are user parameter names, never schema keywords).

**Note:** Also includes commit `9476b0d` which IS #3082's content (walk schema nodes only in cleanJSONSchemaForAntigravity). So merging #3089 effectively includes #3082.

**Risk:** LOW. Well-scoped schema cleaner fix.
**Verdict: MERGE NOW (absorbs #3082).**

---

### PR #3137 — fix(vertex): validate RSA-2048 requirement for SA private key
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | jayeliu |
| Files | 3 (tokenRefresh.js, validate route, test) |
| Risk | LOW |

**Problem:** `refreshVertexToken` signs RS256 JWT with user-supplied SA private key, but only field presence validated. Small RSA keys, EC keys, or garbage PEM blow up at mint time with cryptic jose error: `RS256 requires key modulusLength to be 2048 bits or larger`.

**Fix:**
- `validateVertexSaKey()` in tokenRefresh.js: parses PEM via node `createPrivateKey`, rejects non-RSA and <2048-bit keys with clear message
- Validate route key-checks at save time → UI reports immediately
- Tests: accepts RSA-2048, rejects 1024/EC/garbage/missing; `refreshVertexToken` returns null without network on invalid keys

**Risk:** LOW. Pre-validation only.
**Verdict: MERGE NOW.**

---

### PR #3111 — feat(telemetry): add model, kiro credits, and session id to the DONE line
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | s3rli |
| Files | 5 (formatDoneLine, extractUsage, normalizeUsage, streamingHandler, nonStreamingHandler) |
| Risk | LOW |

**Problem:** The `📊 DONE` console line (only per-request record reaching log aggregation) carries no route identity — per-model usage/latency/cache dashboards impossible from logs. Also Kiro's `meteringEvent` credits (only authoritative cost signal) were dropped by the usage-extraction allowlist.

**Fix:**
- `formatDoneLine` appends `· provider/model`, `· <credits>cr` (4dp, finite only), `· sid:<conversationId>` (when present) — byte-identical when absent
- `extractUsage`/`normalizeUsage` preserve `kiro_credits`
- Both call sites pass provider, model, kiro conversationId

**Example:**
```
DONE 54441ms · TTFT 54412ms · IN 7301 · OUT 1 · kiro/claude-opus-4.8-agentic · 0.0516cr · sid:f31212b8-…
```

**Risk:** LOW. Backward-compatible log format. 10 test cases pass. Live-verified against real kiro.
**Verdict: MERGE NOW.** High value for observability.

---

### PR #3143 — fix(cli): don't kill config subcommand processes during startup cleanup
**Tier: T2 — Kitchen sink, review carefully**

| Field | Value |
|-------|-------|
| Author | kkunkunya |
| Files | 23 |
| Commits | 11 |
| Risk | MED |

**Title fix (small, valuable):** `killAllAppProcesses` matches any node process with `9router` + `cli.js` and SIGKILLs it at every gateway startup. A running `9router config receive/publish/status` matches the same pattern → killed. Exclude config subcommands (receive, publish, status, import, export, device-name) in both Windows (WMI) and macOS/Linux (ps) branches.

**⚠️ BUT the PR bundles 10 more commits (23 files):**
- feat(image): custom openai-compatible image nodes + /v1/images/edits
- feat(dashboard): show custom openai-compatible nodes as image providers
- feat(models): auto-fetch upstream models for custom nodes
- fix(dashboard): combos page shows strategy-kind combos
- feat(dashboard): image providers page whitelist-driven
- fix(grok-cli): normalize cyclic tool schema refs
- feat(cli): config export/import/publish/receive for cross-device sync
- feat(cli): --no-tray background mode + macOS menu bar app build
- fix(macos): app icon, auto-open dashboard, drag-to-install dmg
- fix(cli): ship scripts/ in npm package

**Assessment:** Title fix is clean and valuable. The bundled config sync + macOS packaging features are significant. This is a mega-PR in disguise.
**Verdict: Cherry-pick the title fix commit (f2ccd04) as its own PR; evaluate remaining commits separately.**

---

## Conflict Notes
- #3089 depends on/absorbs #3082 (both thatssoheil schema fixes) — merge together
- #3088 touches kimi registry — no conflict with other kimi PRs (#3088 is registry/transport; kiro PRs are separate provider)
- #3143 touches cli/ packaging — overlaps conceptually with #3069 (ESM interop) and #2907 (homebrew) but no direct file conflict identified
