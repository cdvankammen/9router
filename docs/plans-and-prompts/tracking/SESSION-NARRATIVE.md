# SESSION-NARRATIVE — Full Story (Every Question, Idea, Decision, Failure)

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #history #narrative #full-story

> This is the exhaustive narrative of the entire session. It captures EVERYTHING:
> user questions verbatim (paraphrased where long), agent reasoning, ideas explored
> (adopted AND rejected), failures, fixes, and the evolution of understanding.
> Companion docs: `SESSION-HISTORY.md` (structured), `TASKS.md` (tasks),
> `decisions/` (ADRs), `learnings/` (postmortems).

---

## PART 1 — The Original Ask (2026-08-05)

### Question 1: "How does routing work? Can I add a custom provider and auto-discover /models? Can I set backup providers/models so failures auto-fallback?"

**User's words (condensed):** "Search the code and documentation, online docs, and the code itself. Is there a way when I add a custom provider to have it run /model and automatically get available models? Then is there a way to set a list of backup providers and models so if one fails it tries again before just sending the request to another model, without me needing to manually choose after failed tries? This would let whatever program uses 9router not worry about model failures."

**Agent's initial answer (research-based):**
- Model discovery: YES — validation endpoint (`/api/provider-nodes/validate`) tests `{baseUrl}/models`; dashboard fetch (`/api/providers/[id]/models`) lists models; `providerModelsFetcher.js` has 10-min cache; 40+ built-in providers have per-provider parsers + OAuth refresh
- Fallback: YES — combos (ordered lists, 3 strategies), multi-account rotation, token refresh retry, error classification with exponential backoff

**Key insight the user pushed toward:** a virtual "modelRouter" model that classifies tasks and picks the best model, with automatic fallback so the client NEVER sees failures.

---

## PART 2 — Research Phase (the "plan and prove it" rounds)

### Round A: "What's actually in the system? What exists and doesn't?"

Agent dispatched parallel research agents:

**Finding 1 (combo UI):** `/dashboard/combos` exists with ComboCard list, 3 strategies (fallback/round-robin/fusion), capacity adapter (vision/audio pools), per-combo strategy in settings. NO smart router UI, NO test playground, NO drag-drop in combo modal.

**Finding 2 (request pipeline):** The executor-based virtual provider has a FATAL FLAW — `handleChatCore` translates the body BEFORE the executor runs. Re-dispatching to a different format provider (OpenAI→Claude) would double-translate or need lossy reverse-translation. **This killed the executor approach.**

**Finding 3 (audit of my own earlier work):** The registry import `p120` for 9router was there, capabilities entries were there — but `open-sse/executors/9router.js` had a circular-dependency risk and the whole executor path was architecturally wrong.

**Finding 4 (observability):** `saveRequestDetail()` was thought "never called" by an early audit — FALSE. Deep audit showed it's wired in 7/8 exit paths with buffered/batched writes (zero latency, fire-and-forget). The real gaps: no conversationId, no errorCategory persistence, `appendRequestLog()` is a no-op, no export, no file logging.

### Round B: "Give me options, show me code blocks, self-review them"

Agent presented 4 architecture options for the smart router:

| Option | Approach | Verdict |
|--------|----------|---------|
| A | Pre-combo interception in `handleChat()` | ✅ ADOPTED — mirrors capacity adapter pattern |
| B | Combo `kind:"smart"` strategy | ⚠️ Fights the static-list abstraction |
| C | Capacity adapter extension | ❌ Wrong axis (modality vs task semantics) |
| D | RTK-style pre-translate hook | ❌ Runs too late (after translation decided) |

Agent also self-reviewed the P0 observability code blocks and found:
- "Wiring saveRequestDetail" was **unnecessary** — already wired
- Schema change needed `SCHEMA_VERSION` bump (1→2) + additive auto-sync
- `conversationId` must flow via `sharedCtx` spread (found sub-handlers don't auto-spread — each `buildRequestDetail` call needs explicit field)

### Round C: "Show me the code you'd write, review it again, are there flaws?"

Agent pre-validated against real code:
- `buildRequestDetail()` signature — where to add `conversationId`
- All 4 sub-handler call sites
- Migration strategy (additive auto-sync, version bump triggers backup)
- Streaming non-SSE edge case = the ONLY uncovered exit path

---

## PART 3 — Implementation Phase (the commits)

### Commit 1: `9f4c1631` — smart router baseline
- Created `src/sse/services/smartRouter.js` (classify → score → dynamic combo → sticky)
- Hook in `chat.js` before combo resolution
- `settingsRepo.js` defaults

**Bug that surfaced during testing:** `open-sse/` is gitignored — `git add` needed `-f` even though files were tracked.

### Commit 2-10: Observability suite
- `6f00d23f` conversationId + schema v2
- `a954b88f` export endpoint (test caught conversation ordering bug — details arrive newest-first, sections must sort chronologically)
- `acdc7134` Smart Router UI card
- `1c921ce2` taskType metrics (meta.taskType)
- `d9415807` conversation filter + column
- `5932879f` fallback chain logging
- `d1c1db28` AI Error Analyst
- `57e87729` markdown auto-flush (shared renderer extracted)
- `3e7d1c7c` error categorization engine
- `40168739` errorCategory pipeline FIX (E2E-caught)
- `3f678deb` test isolation fix

### Commit 11: `4627a299` — 4 E2E-caught smart router bugs
1. `PROVIDERS` (transport-only) vs `PROVIDER_MODELS` (alias-keyed) — router always found zero candidates
2. `JSON.parse` on already-parsed combo models
3. Sticky-session wrapper wrong shape
4. `const modelStr` assignment crash

### Commit 12: `99ac899f` — full catalog pickers + allowedModels + per-model fallbacks
- ModelSelectModal shows ALL 40+ providers (was connections-only → user saw only mock)
- "not connected" amber badge
- Smart Router allowedModels wildcards
- Per-Model/Per-Provider Fallbacks card (textarea format)

### Commit 13: `8990a3b4` — retries + custom node support
- `retriesPerModel`/`perModelRetries` in handleComboChat
- Advanced `modelFallbacks` shape
- `getNodeModels()` + node candidate loop (custom openai-compatible nodes)

### Commit 14: `0d07d82f` — docs (this session's tracking)

---

## PART 4 — The E2E Testing Saga (what unit tests missed)

### Setup
- Built production standalone; started on port 20130 with clean DATA_DIR
- Created mock upstream (`/tmp/mock-upstream.cjs`) on port 24000 — OpenAI-compatible with /models, /stats, /reset, /fail429, /fail500, streaming + non-streaming
- Registered it as a custom provider node (`mockreal` prefix) + connection

### The 5+ real bugs found

**Bug A — errorCategory dropped:** E2E request → 429 → captured detail had NO errorCategory. Fix: forward through `buildRequestDetail` + repo flush. Commit `40168739`.

**Bug B — smart router no-op:** `[SMART] No suitable models found` → iterated wrong map. Fix: `PROVIDER_MODELS` + alias mapping. Commit `4627a299`.

**Bug C — 500 TypeError:** `const modelStr` assignment. Commit `4627a299`.

**Bug D — custom nodes invisible:** `allowedModels: ["mockreal/*"]` → 404 openai. Router only scored static registry. Fix: `getNodeModels` + node loop. Commit `8990a3b4`.

**Bug E — `[DONE]` SSE leak (STILL OPEN):** JSON response had literal `data: [DONE]` appended when client omitted `stream`. Root cause: `chatCore.js` line 105 `stream = body.stream !== false` → true when omitted → upstream forced streaming → combo path returns streaming Response without SSE→JSON conversion. **Not yet fixed.**

---

## PART 5 — User Feature Requests Along the Way

### Request: "Add a visual fallback rule builder"
User asked for (under the Per-Model/Per-Provider Fallbacks card):
- Form-style popup + table showing configured rules
- Two sections/tables: per-model and per-provider
- Auto-populating model lists in the form
- Ordered fallback chain (choose order)
- Retry count: universal per rule + optional per-model override
- "Another option of your making for a fluid visually appealing way" — agent's ideas: (a) drag-drop ordered chips with ModelSelectModal picker, (b) "chain builder" visual path diagram, (c) keep textarea for power users as advanced mode
- User: keep what's there, we'll choose one later

**Status:** backend retry support done; UI pending.

### Request: "Explain markdown flush better"
User asked: does "flush interval" mean overwrite or append? Current behavior: **overwrites** the daily file with last-24h of details. Options to present: (a) keep overwrite (simple, always current), (b) append (history grows, risk of bloat), (c) per-conversation files. **Status:** explanation text + decision pending.

### Request: "Track everything, detailed commits with URLs"
User wants: full history in plans-and-prompts, detailed commits referencing PRs/URLs, tracking of what came from where (user vs PRs). **Status:** docs now comprehensive; commit messages include refs (OpenRouter docs etc.). No third-party PRs were merged this session — all changes are original work informed by upstream docs.

---

## PART 6 — Ideas Explored & Rejected (or deferred)

| Idea | Verdict | Why |
|------|---------|-----|
| Virtual provider + executor | ❌ | Double-translation flaw |
| Combo `kind:"smart"` | ❌ | Static lists can't do content-aware selection cleanly |
| Capacity adapter extension | ❌ | Wrong axis |
| RTK-style hook | ❌ | Runs after translation decided |
| Webhook alerting (P3) | ⏳ Deferred | Large scope, not core ask |
| Drag-drop in ComboFormModal | ⏳ Deferred | Cosmetic |
| Cloud sync of fallback rules | ⏳ Deferred | Not requested |
| Per-conversation markdown files | 🤔 Considered | User decision pending on flush semantics |
| "Chain builder" visual path diagram | 🤔 Proposed | One of 3 UI options for rule builder |

---

## PART 7 — Environment / Process Notes

- `docs/plans-and-prompts` is in `.gitignore` (line 92) with `!` un-ignore rules at lines 54-55 — force-add needed
- `open-sse/` files need `git add -f` (tracked but pattern-ignored)
- Other agents work in this repo concurrently: `CLAUDE.md`, `AGENTS.md`, `open-sse/utils/stream.js` had others' changes — left untouched (stream.js has a `streamDoneSent` [DONE] tracker from another agent, related to Bug E)
- VSCode settings synced from exo workspace (Copilot Chat continuation settings)
- Test suite: 1691 pass / 88 pre-existing fail (verified identical on baseline via detached worktree)

---

## UPDATE (2026-08-06, later) — Visual Fallback Rule Builder

### What was built
- `ModelFallbacksSection` now renders a **rules table** (Target | Fallback Chain | Retries | Actions) instead of just a textarea
- New **FallbackRuleModal**: 
  - Target selector (specific model with "Pick…" from ModelSelectModal, OR whole provider)
  - Ordered fallback chain with add-from-picker, up/down reorder, remove
  - Universal retries (1-10)
  - Per-model retry overrides (1-10 or inherit/blank)
  - Saves advanced shape `{target: {models, retries, perModelRetries}}`
- Existing rules display with → chain arrows + per-model override hint
- Delete rule button per row
- Textarea advanced-mode still exists in `toDraftText`/`parseDraftText` (kept for power users)

### Markdown log explanation
- UI now explicitly says "overwrites" — each flush replaces the day's file with latest 24h snapshot (NOT append)
- User decision pending: keep overwrite, switch to append, or per-conversation files

### Status
- Backend: committed (`8990a3b4`) — retries + custom nodes
- UI: built, compiles, pending E2E browser verification
- Commit pending (this change not yet committed)

---

## PART 7 — The [DONE] Leak & Documentation Audit (2026-08-06, continued)

### Question 12: "Make sure we are keeping track of everything"

**User's words (condensed):** "Make sure our commits are well detailed too, include URLs and research. If we make commits to fix problems from other commits or code other people wrote, keep track in commit descriptions. Include links to PRs or commits. Also update plansANDprompts folder with ALL details — questions asked, reasoning, decisions, errors, everything. Other agents are making documents too, look at those."

**Agent's response:** Full audit of existing documentation from multiple agents:
- Read all 4 ADRs (001-004)
- Read all 3 learnings/postmortems
- Read SESSION-NARRATIVE (203 lines, Parts 1-6)
- Read SESSION-HISTORY, TASKS, CHANGELOG
- Read ../templates/session-prompts.md
- Read ../architecture/smart-router-observability.md
- Read ../planning/smart-router-observability-plan.md
- Read meetings/2026-08-05-06-session-summary.md
- Checked for other agent workspaces (.claude, .cursor, .codex, .kiro) — none found

**Gaps identified:**
1. `[DONE]` leak not documented in learnings/
2. SESSION-HISTORY bugs table missing bugs #6 and #7
3. TASK-LOG had completed items still in "In Progress"
4. CHANGELOG missing uncommitted fix details
5. SESSION-NARRATIVE missing Part 7 (this session continuation)

### The [DONE] Leak Investigation (detailed)

**Discovery path:**
1. User reported combo streaming issue → agent tested with mock upstream
2. Initial hypothesis: combo path returns streaming Response without SSE→JSON conversion when client wants non-streaming
3. Testing revealed: non-streaming was actually CLEAN; the real bug was streaming sending `[DONE]` twice
4. Confirmed NOT combo-specific: single-model streaming also doubled `[DONE]`
5. Mock upstream verified to send exactly one `[DONE]`
6. Code search: found `streamDoneSent` flag exists but never set in passthrough mode
7. Root cause: passthrough `transform()` forwards raw lines without parsing, so the flag-tracking logic from translate mode never fires
8. Fix: 4-line addition to set the flag when `data: [DONE]` passes through
9. Rebuild + restart + verify: all three paths clean

**Key insight:** The bug existed since passthrough mode was added. It was never caught because:
- Unit tests don't test streaming output byte-by-byte
- No E2E test counted `[DONE]` occurrences
- The duplicate doesn't cause visible errors in most clients (they just ignore extra `[DONE]`)
- It only became visible during careful curl inspection

### Documentation Standards Established

Per user's explicit request, all future commits must include:
- Full root cause analysis
- Links to related commits/PRs (if fixing prior work)
- Attribution (who wrote the original code, who found the bug, who fixed it)
- External references (URLs, docs, research)
- Whether changes come from user requests, PR imports, or agent-discovered issues

All tracking docs in `docs/plans-and-prompts/` must be updated BEFORE committing, not after.

### E2E Verification (2026-08-06, rule builder)
- Add Fallback Rule modal opens with target toggle (model/provider), Pick… button
- "+ Add Fallback Model" opens the full-catalog ModelSelectModal; selecting a model adds it to the ordered chain with up/down/remove
- Per-model retry override input appears per chain item
- Save persists advanced shape: `{"mockreal/gpt-4o-mini": {"models": ["kc/deepseek/deepseek-chat"], "retries": 1, "perModelRetries": {}}}`
- Rule renders in the table (Target | Chain with → | Retries | Delete)
- Markdown log card shows overwrite explanation

### Open items
- `[DONE]` SSE leak in combo streaming path (root cause known)
- Decide markdown flush semantics (overwrite snapshot vs append vs per-conversation)
- Decide which rule-builder UX to keep (visual builder vs textarea advanced vs future "chain diagram")

### FINAL FIX (2026-08-06): [DONE] leak in JSON responses — RESOLVED
Root cause (debug-traced with temporary logs):
1. `stream = body.stream !== false` forced streaming when client omitted stream
2. Upstream (via translator/executor) normalized to stream:false → returned JSON
3. `handleForcedSSEToJson` returned null (content-type application/json, not SSE)
4. Fell through to streaming path → JSON piped through SSE transform → [DONE] appended

Fix: `stream = body.stream === true` (only explicit requests stream; provider forceStream still respected).
Verified E2E: no-stream → clean JSON; stream:true → exactly 1 [DONE].
Commit: ccde7bff. Full suite 1692 pass / 88 pre-existing fail.

### The complete commit history (this session, all on v1):
9f4c1631 → 6f00d23f → a954b88f → acdc7134 → 1c921ce2 → d9415807 → 5932879f
→ d1c1db28 → 57e87729 → 3e7d1c7c → 40168739 → 3f678deb → 4627a299 → 99ac899f
→ 8990a3b4 → 0d07d82f → d1cc1faa → 3c86d01b → ccde7bff → d43572ec → 6449b58b

---

## FINAL CHAPTER (2026-08-07): The three fallback rule UX approaches — DONE

### The user's ask (exact words, from the session)
> "provide (under that same menu) another option... form style popup and then a table... auto-populating... choose the order models will be in as well as number of retries universally... optional per model override"
> "another option of your making for another way that we could have a really fluid and visually appealing way to make fallback rules"
> "we will eventually choose one of them but for now just keep what is already there"

### What the user meant by "another option" + "third option"
Reading the full request, the user wanted **multiple candidate UIs for the same feature** — a menu of approaches they could compare and later pick from. The first build delivered only ONE approach (modal + table). The completion check caught this gap: the 2nd and 3rd approaches were proposed in docs but never built. This final round built them.

### The three approaches (all edit the same `settings.modelFallbacks`)
1. **Table** — form modal (`FallbackRuleModal`) + rules table. The original, E2E-verified in the prior round.
2. **Chain Flow** — fluid drag-and-drop node chains. Each rule is a row of chips: the target node (highlighted) → sortable fallback chips with drag handles (dnd-kit `useSortable`). Drag a chip onto another to reorder (persisted instantly via PATCH). Inline per-model retry inputs under each chain. Dashed "Add" buttons open the full-catalog picker.
3. **Simple + Advanced** — collapsible rule cards. Simple view: target, chain chips, retries badge. Click the chevron → advanced view: ordered chain with remove buttons, universal retries input, per-model override inputs. Notes that rules run through the same combo engine as named combos.

A view switcher (Table / Chain Flow / Simple + Advanced) sits at the top of the Fallbacks card. Because all three edit one data model, switching views never loses data.

### E2E verification (production standalone, port 20130, mock upstream 24000)
- **Chain Flow drag**: `mockreal/model-id` dragged onto `deepseek` chip → UI order flipped → `PATCH /api/settings` persisted → confirmed via API (`{"models":["mockreal/model-id","kc/deepseek/deepseek-chat"],"retries":1}`) → reload kept the order.
- **Advanced view**: universal retries 1→3 persisted; per-model override `mockreal/model-id:5` persisted; Table view renders `(mockreal/model-id:5)`.
- **All 3 views re-verified** on the rebuilt server with persisted data.
- **vitest**: 1692 pass / 88 fail = exact baseline, zero new regressions.
- **lint**: 7 → 3 errors on the file (4 pre-existing fixed in the rewrite; remaining 3 pre-existing).

### Gotchas this round
- Server killed mid-test during rebuild → PATCH failed with `ERR_CONNECTION_REFUSED`, first drag reorder didn't persist. Retested cleanly after restart — the code was fine, the environment wasn't.
- `tests/translator/__snapshots__/golden-url-header.test.js.snap` regenerates on every vitest run — restore with `git checkout --` before committing.
- dnd-kit `useSensors` cannot be called inside a `.map()` — extracted a per-rule `SortableChain` component (hooks rules).
- `:has-text()` is a Playwright-only selector — invalid inside `page.evaluate`.

### Decision deferred (user's choice)
All three approaches stay available. The user will pick one later; no code needs removing — the view switcher already isolates them.

---

## FINAL CHAPTER 2 (2026-08-07 night): The drop indicator — and the coordinate-space rabbit hole

### The ask
> "for the chain flow option... its hard to know where it will land is there a way that we can have like a vertical bar that will move around in the list showing us where it goes? ... some kind of vertical bar indicator showing where in the list if i were to let go the card i am holding would land and it would move around as i move the card around"

Also: sweep ALL tracking docs, include errors, make new folders/files as needed.

### The design (explained to the user first, then built)
The standard **drop indicator** pattern (Trello/Notion/VS Code style): while holding a chip, a thin vertical accent bar slides between the other chips showing the exact landing slot. Built with three pieces:
1. Compute the insertion slot on EVERY pointer move (`onDragMove`) — pointer vs sibling chip centers in reading order (handles flex-wrap rows)
2. Render a 3px accent bar at the gap between the chips around that slot, using their live rects (dnd-kit shifts siblings aside, so the gap is where the bar goes)
3. Reuse the computed index on drop so the final order matches the bar

### The debugging story (the real meat)
The bar initially rendered but was FROZEN (never moved). Three things fought us:
1. **Embedded-browser mouse flakiness** — `page.mouse.down()` stopped emitting pointer events mid-session. Switched to synthetic `PointerEvent` dispatch, which dnd-kit's PointerSensor accepts and which exercises the real handler pipeline.
2. **Off-viewport drag targets** — chips below the inner scroller's visible area eat no events; `boundingBox()` lies about visibility. Fix: scrollIntoView + `elementFromPoint` check.
3. **THE bug** — dnd-kit's `active.rect.current.translated` is **content-relative** in scrolled containers. The dashboard uses an inner `overflow-y-auto` scroller; `window.scrollY` is 0 while `translated.top` was 2228 (content coords). Comparing that against viewport-relative chip rects put the pointer "below" every chip → insert index pinned at the end. First fix (`window.scrollY` normalization) FAILED because the scroll container isn't the window. Working fix: dragged chip's live viewport rect = `initial rect + event.delta` — apples-to-apples with `getBoundingClientRect()`.

### Proof
Synthetic drag sweep across a sibling chip: bar tracked `left: 378.663px → 181.45px` live; release at the far-left → chain reordered to `[kc/deepseek/deepseek-chat, mockreal/model-id]` and persisted in settings. Env restored.

### The docs sweep (what the user asked for)
Every folder in docs/plans-and-prompts was checked and filled:
- Updated: CHANGELOG, SESSION-HISTORY, SESSION-NARRATIVE, TASKS, ../operations/ui-testing-workflow.md
- NEW: learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md
- NEW: ../research/9router/16-ux-research-drop-indicator-and-override-placement.md
- NEW: decisions/ADR-006-drop-indicator-approach.md
- NEW: ../planning/fallback-rules-ux-plan.md
- NEW: meetings/2026-08-07-session-summary.md
- ../architecture/smart-router-observability.md and ../templates/session-prompts.md reviewed (no changes needed); temp/ unused.

### Cumulative session state (what everything looks like now)
- Fallback rules UI: 5 views (Table / Chain Flow / Simple + Advanced / Guided Wizard / Expert Text), all editing `settings.modelFallbacks`, with provider picker, smart toggle switching, drag everywhere (chains + modal), drop indicator, sr-* cleanup toggle.
- Smart router + observability suite from earlier chapters all still green.
- 1718 pass / 88 baseline fail. HEAD `b520c9d6`.

---

## PART 8 — Webhook Receive & Act Research (2026-09-15)

### The ask (verbatim, condensed)
"Deep research the code and let me know if there is a place for where webhooks can be received by 9router with information and a place that can allow for things to happen from those. If not then make sure we research all the different options that could work that other programs do, popular included and not, and then research each of those at a minimum binary tree style depth of 5." → then: "double the expansion of research and continue what you are doing so research what you researched up to 6 branches in a binary tree worth of research."

### Phase 1 — Codebase audit (the verdict)
- `grep "webhook"` in `src/**` → **EMPTY**. All 144 matches live in docs/plans-and-prompts, gitbook/content, worktrees (docs only).
- No inbound webhook receiver, no outbound webhook sender, no event bus / EventEmitter / pub-sub / hooks system in the backend.
- Only UI toasts (`src/store/notificationStore.js` — Zustand) and CLI tray notifications.
- No quota-alert webhooks implemented (`quotaAlert|quotaThreshold|alertAt|budgetAlert` → EMPTY).
- **Docs-only plans:** `messages-page-feature-spec.md` §6 (Apprise-style URLs → Slack/Discord/ntfy/Gotify/Telegram; Alertmanager semantics: group by fingerprint, min-interval dedupe, silence window) — Deferred P3. `quota-tracking.md` (quota warnings 80%/90%/exhausted; delivery: Dashboard/Email/Webhook) — aspirational.
- **Reusable infra identified:** API route pattern, settingsRepo (DEFAULT_SETTINGS + PATCH + PROTECTED_SETTING_KEYS), instrumentation.js background jobs, analyze-error LLM pipeline (credentials → handleChatCore), usageDb request capture, tunnel exposure, SQLite layer, quotaAutoPing scheduler.

### Phase 2 — External research (depth 5, then doubled to depth 6)
Subagent attempts hit `rate_limit_exceeded` — switched to direct `fetch_webpage` research, which worked reliably. 20+ programs researched at 6 levels (L1 Mode → L2 Events → L3 Transport & Auth → L4 Processing & Actions → L5 Configuration & Ops → L6 Pattern Classification):

**LLM gateways (all send-only):** LiteLLM (alert types, alerting_args, digest mode, budget webhooks BETA), One API/new-api (Message Pusher, ENABLE_METRIC auto-disable, sandboxed JS plugins), Helicone (per-request webhooks, HMAC-SHA256, sample rate), OpenRouter/Portkey/CF (managed alert senders), Kong/APISIX/Traefik (in-process plugin hooks, not webhooks).

**Automation platforms:** Home Assistant (⭐ best inbound model: `POST /api/webhook/<webhook_id>`, secret-ID auth, trigger→condition→action), n8n (webhook node, respond modes, 16MB cap), Node-RED (flow-based programming), Pipedream (⭐ `$.respond({immediate: true})` ack-then-process, 5TB uploads), Huginn (agent graph, 49.9k★), Zapier/Make/IFTTT (hosted iPaaS), Inngest (embedded event queue).

**Messaging platforms:** Slack (⭐⭐ HTTP + Socket Mode: HMAC `v0:<timestamp>:<raw_body>`, 5-min tolerance, 3s rule, retries ×3, mutual TLS, "implement a queue" mandate), Discord (⭐⭐ Ed25519 signatures, 5 interaction types, 3s rule, 15-min tokens, Slack/GitHub-compatible webhook endpoints), Telegram (setWebhook vs getUpdates long polling, secret token), ntfy (topic=password, action buttons), Gotify (appToken/clientToken, OIDC), Apprise (⭐ 100+ services, one URL scheme).

**Webhook infra:** Stripe (⭐⭐ gold standard: `t=<ts>,v1=<hmac>`, 5-min tolerance, dedupe by event ID, retries 3 days), GitHub (X-Hub-Signature-256, delivery GUID), Svix/Standard Webhooks (⭐ webhook-id/timestamp/signature, raw body via `req.text()` — critical for Next.js), Hookdeck (source→connection→destination, dedup/filter/transform).

**Monitoring:** Uptime Kuma (91.4k★, 90+ notifications, push monitoring), Healthchecks.io (dead man's switch, alert on ABSENCE of pings).

**Event patterns:** EventEmitter (in-process), Transactional Outbox (SQLite-friendly), Message Queues (overkill), SSE (9router already uses), WebSocket (Slack Socket Mode), Long-Polling (Telegram).

### The taxonomy — 12 archetypes
1. TCA Rule Engine (Home Assistant) · 2. Visual Workflow Engine (n8n) · 3. Flow-Based Programming (Node-RED) · 4. Event Source + Workflow (Pipedream) · 5. Agent Graph (Huginn) · 6. HMAC-Signed Receiver (Stripe/GitHub/Svix) · 7. Dual-Mode Receiver (Slack/Telegram) · 8. Ed25519 Receiver (Discord) · 9. Outbound Alert Router (LiteLLM/Uptime Kuma) · 10. Universal Adapter (Apprise) · 11. Dead Man's Switch (Healthchecks.io) · 12. Embedded Event Queue (Inngest).

### The recommendation
**Hybrid of #1 + #7 + #10:** `POST /api/webhooks/[id]` (Home Assistant secret UUID) + HMAC verification (Standard Webhooks spec, raw body via `req.text()`, 5-min tolerance, constant-time compare) + respond 2xx <3s + enqueue async (Slack mandate) → SQLite outbox table (`webhook_events`: event_id idempotency key, status pending→processing→delivered/failed, attempts, next_retry_at) + instrumentation.js-style worker → TCA JSON rules in settingsRepo (`webhookRules`, PATCH-able via `/api/settings`) → actions: notify (Apprise-style URLs — the P3-deferred spec), http, llm (reuse analyze-error pipeline — Slack's reacji→LLM pattern), gateway (toggle provider/fallback — One API auto-disable), dashboard (SSE feed). Outbound triggers: quota 80%/90%/exhausted, provider error spike, fallback event, new model added, daily spend report.

### Key design decisions (each backed by a researched precedent)
HMAC+timestamp (Stripe/Slack/Svix/GitHub) · raw body for HMAC (Svix/Next.js) · 2xx<3s + queue (Slack/Discord/Pipedream) · SQLite outbox not Redis/RabbitMQ (single-node local-first) · event IDs for idempotency (Stripe/GitHub/Slack/Telegram) · dual mode HTTP + long-polling (Telegram/Slack) · Apprise-style outbound (9router's own deferred spec) · TCA rules (Home Assistant/n8n/Node-RED) · LLM action reuse (analyze-error + Slack) · TCA in settings (settingsRepo pattern).

### Deliverables
- `research/2026-09-15-webhook-receive-act-research.md` (new) — full 6-level report
- `planning/2026-09-15-webhook-receive-act-plan.md` (new) — M1 receiver → M5 dashboard UI
- Indexes updated: research/README.md, tracking/TASKS.md, tracking/CHANGELOG.md, tracking/SESSION-HISTORY.md, tracking/SESSION-NARRATIVE.md

**Status:** Research complete. Implementation deferred — awaiting user go-ahead.

---

## PART 9 — Webhook Binary-Tree Research Expansion (2026-09-15)

### The ask (verbatim, condensed)
"when i said binary tree all i meant was that each research or phrase or thing that you research from a document must go a minimum of 6 times deep worth of research and that expands into a crazy exponential amount of work is that what you did if not then add to what i gave you and do the research in that format this time. this does not mean you remove what you have done"

### What changed
The user clarified that "binary tree" meant **recursive expansion**: each research finding branches into 2 sub-topics, × 6 levels = 63 nodes per root (L0 + 2 L1 + 4 L2 + 8 L3 + 16 L4 + 32 L5, with L6 leaves described inside branch docs). The prior flat per-program 6-level analysis was NOT removed — the true binary tree was built **on top of it** as additional docs.

### Deliverables (docs only, no code)
- `research/2026-09-15-webhook-master-research-tree.md` (new) — the 63-node master map: L0 root → L1 INBOUND/OUTBOUND → L2 RECEIVER/PROCESSING/CHANNELS/TRIGGERS → 8 L3 branches, each with its own doc covering its 7-node subtree (L3 + 2×L4 + 4×L5) plus L6 leaf details.
- 8 branch docs (new): `2026-09-15-webhook-branch-{a1a-transport, a1b-auth-security, a2a-event-store, a2b-rule-engine, b1a-messaging-platforms, b1b-push-services, b2a-internal-events, b2b-scheduled-monitoring}.md`

### The 8 branches (each a 7-node subtree, 8 L6 leaves)
- **A1a Transport:** POST /api/webhooks/[id] + allowed_methods; response contract 2xx <3s + challenge handshake; raw body via `req.text()` before JSON parse (HMAC requirement); payload size caps + large-payload offload.
- **A1b Auth & security:** HMAC verification — Stripe `t=,v1=` vs Standard Webhooks `v1,` schemes; timingSafeEqual constant-time compare; 5-min timestamp tolerance; secret ID in URL (UUID-as-password, local_only binding); rotation with `whsec_` prefix + dual-secret grace.
- **A2a Event store:** outbox table (event_id idempotency key, status machine pending→processing→delivered/failed); transactional outbox (same-DB write, at-least-once); settings-gated worker (instrumentation.js pattern); polling interval; exponential backoff; dead-letter.
- **A2b Rule engine:** TCA model (Home Assistant trigger→condition→action); JSON rules in settingsRepo (PATCH-able via /api/settings); field/op/value ops (n8n Only Run If) + JSONPath v2 (Hookdeck Filters); action types notify/http/llm/gateway/dashboard; LLM action reuses analyze-error pipeline (Slack reacji→LLM precedent); actions in worker not route (Slack "implement a queue" mandate); idempotent actions (Stripe dedupe).
- **B1a Messaging platforms:** Slack incoming webhooks (`hooks.slack.com/services/T/B/X`, blocks/attachments, 30k events/hr cap, sender-side retries — x-slack-retry-num semantics); Discord (`/webhooks/<id>/<token>`, slack/github-compatible endpoints → one formatter for both); Telegram (sendMessage API, chat_id = user/group/channel).
- **B1b Push services:** ntfy (topic=password, action buttons ≤3, X-Delay 10s–3d, github/grafana/alertmanager templates); Gotify (appToken sender vs clientToken receiver, X-Gotify-Key header); Apprise (one URL → 100+ services, schema:// config, tag routing OR/AND/priority/escalation) — operationalizes the P3-deferred messages-page spec §6.
- **B2a Internal events:** quota events at 80%/90%/exhausted (LiteLLM budget webhooks vocabulary: budget_crossed/threshold_crossed/projected_limit_exceeded), wired into quotaAutoPing scheduler, emit-on-transition dedupe; provider error spike (5 minor / 10 major per window — LiteLLM outage_alerts), auto-disable (One API ENABLE_METRIC), fallback.used, provider.cooldown (LiteLLM cooldown_deployment).
- **B2b Scheduled & monitoring:** daily spend digest (LiteLLM digest_interval 86400, report_check_interval 3600, persist last-sent in settingsRepo — better than LiteLLM's in-memory); new_model_added alert on model catalog sync (instrumentation.js); dead man's switch (Healthchecks.io model: New→Up→Late→Down→Paused, /start /fail /<exitcode> suffixes, watchdog over background jobs, grace = 2× interval).

### Indexes updated
- `research/README.md` — added master tree + 8 branch docs rows
- `tracking/TASKS.md` — new "Webhook Binary-Tree Research Expansion" section (T1–T9)
- `tracking/CHANGELOG.md` — 2026-09-15 entry for master tree + 8 branch docs
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 9

**Status:** Research complete. Implementation deferred — awaiting user go-ahead.

---

## PART 10 — Message-Driven Tool-Building Research (2026-09-15)

### The ask (verbatim, condensed)
"look at messages per conversation. use everything in a message request for filter/build/record/more options. IDE/agent identification as a first-class dimension. create a home in docs/plans-and-prompts."

### What changed
The user wants **every field** of a captured message to be a first-class dimension — not just the ~10 fixed filters. The session produced a research doc (requestDetails anatomy, identity signals, API surface, 9 gaps, 4 design options), a plan (M1 facets → M6 UI), and an ADR (Option 4 hybrid).

### Deliverables (docs only, no code)
- `research/9router/38-message-driven-tools-research.md` (new) — requestDetails anatomy (30+ fields), identity signals (detectClientTool, trusted headers, per-provider UAs), Messages API surface, 9 gaps, 4 design options, identity as dimension, build/record primitives, privacy, confidence, open questions
- `planning/message-driven-tools-plan.md` (new) — M1 facet extraction + indexing, M2 JSON-path query language, M3 identity as dimension, M4 annotations + saved views, M5 per-message actions + webhook/script hooks, M6 truncation surfacing + UI
- `tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md` (new) — Option 4 hybrid (extract-and-index hot path + JSON-path long tail)

### Key findings
- **Capture pipeline:** `requestDetails.data` is a rich structured event (~30+ fields: latency, tokens, request params, providerRequest/Response, response, pxpipe, status, conversationId, sourceApp, userAgent, url, cost) — but only ~10 fixed dimensions are filterable server-side.
- **Identity:** `detectClientTool` covers ~6 tools; governance M1 lists ~12+; no IDE-level detection; no trusted `X-9R-App/User/Session` headers yet.
- **9 gaps:** fixed dimensions only, no JSON-path, no saved views/alerts, no per-message actions, no annotations, no conversation-level tooling, under-captured identity, silent truncation, no structured extraction.
- **Design space:** 4 options; hybrid (extract-and-index hot path + JSON-path long tail) recommended — mirrors existing `requestDetails` columns + `data` JSON pattern (ADR-007).
- **Build/record primitives:** annotations table, saved views, per-message action menu, webhook/script hooks with template expansion, conversation-level export/summarize/fork.

### Indexes updated
- `research/README.md` — added 38-message-driven-tools-research.md row
- `planning/README.md` — added message-driven-tools-plan.md row
- `tracking/DECISIONS.md` — added ADR-010
- `tracking/CHANGELOG.md` — 2026-09-15 entry
- `tracking/TASKS.md` — new "Message-Driven Tool-Building" section (M1–M6, P1–P6, A1)
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 10

**Status:** Research + plan + ADR complete. Implementation deferred — awaiting user go-ahead.

---

## PART 11 — Webhook Exponential Research Expansion (2026-09-15)

### The ask (verbatim, condensed)
"for everything that you research from one document (and you can have more than one that you start with) and for every phrase that you decide i want to learn more about in that document that for each of those phrases you go at least 6 levels deep and for each level you may find hundreds of more phrases you want to research and then you will go and research each of those... it would be exponential not just a 1 to 2 to 4 to 8 etc kind of research tree."

### What changed
The user clarified "binary tree" a second time — it is **not** a 1→2→4→8 tree. Every phrase in the source documents is a root; each root branches **N-ary** (3–15+ children per node, up to hundreds), 6 levels deep. This is true exponential expansion. The session produced an exponential master map (48 roots R01–R48) + 11 branch docs, additive to the flat research and the 2-way binary tree — nothing removed.

### Deliverables (docs only, no code)
- `research/2026-09-15-webhook-exponential-master-map.md` (new) — 48 roots, N-ary methodology table, node-count summary (11,862 enumerated nodes), root inventory R01–R48
- 11 branch docs `research/2026-09-15-webhook-exp-*.md` (new):
  - exp-01 receiver & transport (R01–R04)
  - exp-02 auth & secrets (R05–R08)
  - exp-03 event store & worker (R09–R11)
  - exp-04 rule engine & actions (R12–R14)
  - exp-05 messaging platforms (R15–R17)
  - exp-06 push services (R18–R20)
  - exp-07 internal events (R21–R23)
  - exp-08 scheduled & monitoring (R24–R25)
  - exp-09 standards & infra (R26–R29)
  - exp-10 patterns & platforms (R30–R46)
  - exp-11 HTTP client architecture (R47–R48)

### Key findings
- **Scale:** 48 roots × 6 levels, N-ary branching — 11,862 enumerated nodes (172 L1 / 439 L2 / 912 L3 / 1,759 L4 / 3,179 L5 / 5,401 L6). With branching factor 4 ≈ 65,520 nodes; factor 6 ≈ 448,000.
- **Every node carries** a finding + precedent + 9router application — the N-ary format makes each leaf actionable, not just a label.
- **Root groups:** receiver/transport, auth/secrets, event store/worker, rule engine/actions, messaging platforms, push services, internal events, scheduled/monitoring, standards/infra, patterns/platforms (17 roots), HTTP client architecture.
- **Naming fix:** the HTTP-client doc was initially created as exp-05, conflicting with the master map's reserved exp-05 (messaging platforms) — renamed to exp-11 via `mv`, roots renumbered R15–R16 → R47–R48, master map node counts updated (46→48 roots, 11,329→11,862 nodes).

### Indexes updated
- `research/README.md` — added exponential master map + exp-* rows
- `tracking/CHANGELOG.md` — 2026-09-15 entry
- `tracking/TASKS.md` — new "Webhook Exponential Research Expansion" section (E1–E12)
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 11

**Status:** Research complete. Implementation deferred — awaiting user go-ahead.

---

## PART 12 — Webhook Interpretation Layer (2026-09-15)

### The ask (verbatim, condensed)
"have you made to do the interpretation of those documents to and make sure that your research is in full working and understandable and organized order if not. take all the documents and create a set of documents that put everything in clear readable and easy to understand the intent of work and order"

### What changed
The user asked for an **interpretation layer** — not new research, not a plan, but a set of documents that make the existing 23 webhook docs understandable, organized, and ordered. The research was dense (48KB flat research, 8 branch docs, 11 exponential branch docs, 11,862 enumerated nodes) and needed a map. The session created a new `interpretation/` category with 4 docs.

### Deliverables (docs only, no code)
- `interpretation/README.md` (new) — new category explaining the interpretation layer: plain-language guides, doc-by-doc summaries, syntheses, reading/build orders. Not new research, not a plan — the map over research/planning/tracking.
- `interpretation/2026-09-15-webhook-interpretation-guide.md` (new) — one-page summary, the 4 phases of work, complete doc map (23 docs), key conclusions, recommended reading order, next steps
- `interpretation/2026-09-15-webhook-doc-by-doc.md` (new) — plain-language summary of every webhook doc: what it is, what it covers, key takeaways, how it fits, what to read next
- `interpretation/2026-09-15-webhook-synthesis.md` (new) — distilled knowledge: verdict, 12 archetypes, recommended architecture, 10 design decisions, 48 roots → 11 branches, open questions, confidence levels
- `interpretation/2026-09-15-webhook-order-and-next-steps.md` (new) — chronological timeline, logical reading order, build order (M1–M5), deferred items, open decision points

### Key findings
- **The research exists in 4 layers:** flat research (1 doc + 1 plan), 2-way binary tree (1 master tree + 8 branch docs), exponential N-ary (1 master map + 11 branch docs), and now interpretation (4 docs).
- **The interpretation layer is NOT new research and NOT a plan** — it is the map over research/planning/tracking, written for a reader who has NOT read the source docs.
- **Every interpretation doc links back to its source docs** with relative paths.
- **The recommended reading order:** interpretation guide → synthesis → flat research → plan → 2-way tree → exponential tree → tracking.
- **The build order remains M1 (receiver) → M2 (outbox) → M3 (rules) → M4 (outbound) → M5 (UI, P2)**, each milestone mapping to specific exp branch docs.
- **New category added to main README:** `interpretation/` now appears in the folder taxonomy table.

### Indexes updated
- `README.md` (main) — added interpretation category to folder table
- `interpretation/README.md` — new category doc
- `tracking/CHANGELOG.md` — 2026-09-15 entry for interpretation layer
- `tracking/TASKS.md` — new "Webhook Interpretation Layer" section (I1–I6)
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 12

**Status:** Interpretation complete. Implementation deferred — awaiting user go-ahead.

---

## PART 13 — Webhook Implementation Plans (code-level, agent-review notes)

### The ask (verbatim, condensed)
"continue your work and make sure that all the documents have been interpreted
and that you have put all tasks and implementation work (meaning if you have not
create all sorts of different implementation plans, no matter if we ended up
making ones that overlap then you need to make sure that you create those
implementation plans all the way to the point that we even have code for in the
implementation plan and making sure that it is mentioned for agents that read
those plans that this code is for the agent to review and make decision for if
there are better ways to implement and make those changes happen)"

### What changed
The user asked for the next layer after interpretation: **implementation plans
with real code**, down to the file level, in *all sorts of different* variants
(overlapping allowed), each carrying an explicit note that agents reading the
plans must review the code and make better-implementation decisions. The session
created 8 plans in `planning/` — the 5 milestone plans (M1–M5) plus 3
intentionally overlapping plans (messaging platforms, push services, standards
compliance).

### Deliverables (8 plans, code down to file level, no code written to src/ yet)
- `planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` (new) — M1 receiver:
  `src/lib/webhooks/verify.js` (Standard Webhooks HMAC SHA-256 over
  `id.timestamp.rawBody`, `crypto.timingSafeEqual` with length guard, 5-min
  timestamp tolerance), `registry.js` (list/get/create/delete/rotate secret),
  `src/app/api/webhooks/[id]/route.js` (POST via `request.text()` raw body,
  401/404/405/OPTIONS), settingsRepo `webhooks: []` default.
- `planning/2026-09-15-webhook-m2-outbox-worker-plan.md` (new) — M2 outbox:
  migration `005-webhook-events.js` (webhook_events table: event_id PK,
  webhook_id, payload, status pending/processing/delivered/failed/dead,
  attempts, next_retry_at, created_at, processed_at, last_error + status
  index), `webhookEventsRepo.js` (insertEvent idempotent, claimPendingEvents,
  markDelivered, markFailed with exponential backoff 2^attempts,
  MAX_ATTEMPTS=5), `worker.js` (global.__webhookWorker singleton, 5s poll),
  instrumentation.js settings-gated wiring, settingsRepo `webhookWorker`
  default.
- `planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` (new) — M3 TCA
  rule engine: `rules.js` (evaluateCondition and/or trees, getField dot-path,
  compare ops eq/neq/gt/lt/contains/regex, ruleMatches, dispatchEvent with
  ACTION_HANDLERS map), actions `notify.js` (6 Apprise schemes via
  proxyAwareFetch), `http.js`, `llm.js` (reuses handleChatCore +
  getProviderCredentials + getModelInfo — analyze-error pipeline), `gateway.js`
  (provider/fallback toggle placeholder), `dashboard.js` (SSE listeners Set),
  settingsRepo `webhookRules` + `notifyUrls` defaults.
- `planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (new) — M4
  outbound: `emitter.js` (fail-open → insertEvent with randomUUID),
  quotaAutoPing edit (emitQuotaEvents with emittedThresholds dedupe, 80/90/100
  transitions), chatCore edit (provider.error + fallback.used emits),
  modelCatalog/sync edit (model.added), `digest.js` (maybeSendDailyDigest with
  persisted lastSentAt — survives restart, better than LiteLLM in-memory),
  settingsRepo `webhookDigest` default.
- `planning/2026-09-15-webhook-m5-dashboard-ui-plan.md` (new) — M5 dashboard UI:
  `src/app/dashboard/webhooks/page.js` + `events/page.js`, components
  `WebhookForm` (create/toggle/delete, secret UUID), `RuleEditor` (JSON rules,
  add/remove), `EventTable` (status/attempts/error), `src/app/api/webhooks/
  events/route.js` (GET event log, limit + status filter).
- `planning/2026-09-15-webhook-messaging-platforms-plan.md` (new) — overlapping:
  Slack/Discord/Telegram platform modules, shared Slack/Discord formatter
  (blocks + context), Discord slack-compatible endpoint reuse.
- `planning/2026-09-15-webhook-push-services-plan.md` (new) — overlapping:
  ntfy (public + authenticated self-hosted, priority/tags headers), Gotify
  (token + priority), Pushover (user key + app token, priority + sound).
- `planning/2026-09-15-webhook-standards-compliance-plan.md` (new) — overlapping:
  Svix header aliases (svix-id/timestamp/signature), outbound signing
  (9router as sender), Zapier-style envelope (X-Zapier-* headers + payload).

### Key findings
- **Every plan carries the AGENT REVIEW NOTE verbatim:** the code is a starting
  point, not a final decision — every agent that reads the plan MUST review the
  code, decide if there is a better way, make those changes happen, and proceed.
- **Code follows verified 9router conventions:** settingsRepo DEFAULT_SETTINGS
  nested configs, instrumentation.js settings-gated dynamic-import workers,
  analyze-error handleChatCore reuse, migrations 001–004 registration pattern,
  quotaAutoPing global singleton scheduler, proxyAwareFetch for outbound HTTP.
- **Plans intentionally overlap** (messaging/push overlap M3 actions; standards
  overlaps M1 receiver) per the user's explicit allowance — "no matter if we
  ended up making ones that overlap".
- **The build order remains M1 → M2 → M3 → M4 → M5**, with the three overlapping
  plans as deep-dives on specific action/verification surfaces.

### Indexes updated
- `planning/README.md` — added 8 webhook plan rows to the contents table
- `tracking/CHANGELOG.md` — 2026-09-15 entry for the 8 implementation plans
- `tracking/TASKS.md` — new "Webhook Implementation Plans" section (P1–P8)
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 13

**Status:** 8 implementation plans complete (code-level, agent-review notes).
Code implementation deferred — awaiting user go-ahead.

---

## PART 14 — Full Coverage: Implementation Plans for EVERY Research Root (R01–R48)

**Date:** 2026-09-15
**User directive:** *"now did you make an implementation plan for every single option that was found and layer for things that could be an option for 9router to do? if not do that now"* — every research root must have a plan. Then: *"and did you make sure that it will do that implementation plan all the way down to the point at which code is inputted into that implementation plan as well with the notes to the agents that read it that this is for suggestions and can be changed if found that other options for code is better to implement the outcomes of the plan"* — every plan must contain code down to file level AND the agent-review note.

### What was done
Audited the 48-root master map (`research/2026-09-15-webhook-exponential-master-map.md`) against the 8 existing plans. Found 21 roots with no plan: R20, R25, R26, R27, R29, R30, R32, R33, R34, R35, R37, R38, R39, R40, R41, R42, R43, R44, R45, R46, R47–R48. Created 21 new code-level plans covering them:

| Plan | Roots | Core idea |
|------|-------|-----------|
| `webhook-dead-mans-switch-plan.md` | R25 | Heartbeat monitor, missed-window alert, cooldown dedupe |
| `webhook-stripe-model-plan.md` | R26 | Stripe-style envelope, Idempotency-Key, type allowlist, replay |
| `webhook-github-model-plan.md` | R27 | X-GitHub-Event/Delivery, X-Hub-Signature-256 hex, ping |
| `webhook-hookdeck-ingress-plan.md` | R29 | Catch-all ingress, source registry, per-source format dispatch |
| `webhook-apprise-adapter-plan.md` | R20 | Apprise URL adapter — Option A (npm) vs Option B (native), agent decides |
| `webhook-pubsub-core-plan.md` | R30 | Typed event bus, wildcard, fail-open, outbox bridge |
| `webhook-message-queue-plan.md` | R32 | Queue adapter — BullMQ (Redis) vs in-process, drop-oldest |
| `webhook-sse-feed-plan.md` | R33 | SSE stream endpoint, heartbeat, client hook |
| `webhook-websocket-feed-plan.md` | R34 | WS hub, broadcast, ping/pong cleanup |
| `webhook-long-polling-plan.md` | R35 | Cursor-based long-poll, 25s hold, batch return |
| `webhook-n8n-workflows-plan.md` | R37 | Workflow DAG executor, trigger/transform/condition/action nodes |
| `webhook-nodered-flows-plan.md` | R38 | Message-passing flows, inject/function/switch/http/notify nodes |
| `webhook-pipedream-steps-plan.md` | R39 | Linear step runner, steps.<name> state, $ context |
| `webhook-huginn-agents-plan.md` | R40 | Scheduled agents, watch/schedule/digest types, event chaining |
| `webhook-inngest-functions-plan.md` | R41 | Code-first functions, trigger matching, retries, step.run |
| `webhook-litellm-alerts-plan.md` | R42 | Budget/error-rate/latency/daily-report alerts |
| `webhook-oneapi-metrics-plan.md` | R43 | JSON + Prometheus metrics endpoints |
| `webhook-helicone-observability-plan.md` | R44 | Custom properties, request.completed events, feedback endpoint |
| `webhook-uptime-kuma-plan.md` | R45 | Push API client, periodic heartbeat |
| `webhook-healthchecks-io-plan.md` | R46 | Ping client, start/fail/log endpoints |
| `webhook-http-client-plan.md` | R47–R48 | webhookFetch wrapper, timeout/retry/backoff/jitter |

### Verification (terminal, 2026-09-15)
- `ls planning/2026-09-15-webhook-*.md | wc -l` → **31** (29 code-level plans + 2 original outline docs)
- `grep -l "AGENT REVIEW NOTE" planning/2026-09-15-webhook-*.md | wc -l` → **29** — every code-level plan carries the note
- New-plan file count → **21** — all created this session

### Answer to the user's second question
**Yes.** Every one of the 29 code-level plans goes all the way down to actual code — file paths, function signatures, and implementation snippets following 9router's verified conventions (settingsRepo DEFAULT_SETTINGS, instrumentation.js settings-gated workers, Next.js route handlers, migrations registration, quotaAutoPing singleton, proxyAwareFetch). And every plan carries the **AGENT REVIEW NOTE** verbatim: the code is a starting point, not a final decision — agents MUST review it, decide if there is a better way, make those changes happen, and proceed.

### Indexes updated
- `planning/README.md` — 21 new rows (29 webhook plan rows total)
- `tracking/CHANGELOG.md` — 2026-09-15 entry for the 21 new plans
- `tracking/TASKS.md` — P9–P29 rows (29 plans total, all 48 roots covered)
- `tracking/SESSION-HISTORY.md` — session entry
- `tracking/SESSION-NARRATIVE.md` — this PART 14

**Status:** 29 implementation plans complete — every research root R01–R48 covered, all code-level with agent-review notes. Code implementation deferred — awaiting user go-ahead.


---

## PART 15 — Clarification: "Implementation plan" = research document with suggested code (2026-09-17)

**User clarification:** *"when i say implementation plan it does not mean to implement anything it only means that you are researching every possible option to the point that you have code in that plan as a part of suggestions for future agents to look at and with explicit work that those are specifically made to be suggestions and options for code to implement and allow future agents to know better how to implement and where etc"*

### What was done
- Standardized the **AGENT REVIEW NOTE (READ FIRST)** block across **all 31 webhook plan files** (29 code-level plans + 2 outline docs).
- The note now explicitly states:
  1. ⚠️ THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION
  2. Code is a SUGGESTION / OPTION for future agents — NOT a final decision, NOT an instruction to implement anything
  3. Code snippets show possible approaches (file paths, function signatures, patterns) — options, not requirements
  4. Nothing in this plan should be implemented automatically — future agents evaluate each suggestion, decide if there's a better way, and only then proceed
  5. The agent is the final arbiter: if a better approach exists, make those changes happen
- Verified: 31/31 files contain all four key phrases (grep counts confirmed).

**Status:** All 31 webhook plans are now explicitly framed as research documents with suggested code for future agents. No implementation has been done — and the plans now say so explicitly.


---

## PART 16 — Grounding pass: Rationale & Design Decisions added to all 31 plans (2026-09-17)

**User question:** *"are they fully implementable meaning they actually are ready for being used and not just ungrounded in research and ungrounded in purpose and explanation"*

### Audit result (before this pass)
- ✅ 31/31 plans had: code blocks, file paths, acceptance criteria, testing, related-docs references
- ✅ 30/31 referenced research docs; 28/31 carried root IDs (the 2 outline docs and m5 are milestone-level by design)
- ❌ **0/31 had an explicit Rationale / Design-Decisions section** — the "why" was implicit in prose but not stated as a first-class section

### What was added (all 31 files)
A **"Rationale & Design Decisions"** section inserted after Scope, containing:
1. **Purpose** — the problem the feature solves
2. **Research grounding** — exact experiment docs + root IDs (R01–R48) the plan derives from
3. **Key design decisions** — choices made and why (e.g., Standard Webhooks spec over custom auth; HMAC + timingSafeEqual; settings-backed registry; fail-open evaluation; adapter interfaces)
4. **Trade-offs & risks** — what was given up and when to pick an alternative plan (e.g., SSE vs WebSocket vs long-poll; Apprise npm vs native; BullMQ vs in-process)

### Verification
- `grep -l "^## Rationale & Design Decisions"` → **31/31**
- `grep -l "**Purpose:**"` → **31/31**
- `grep -l "**Research grounding:**"` → **31/31**
- `grep -l "**Trade-offs"` → **31/31**

**Status:** All 31 webhook plans are now grounded in research (citations), purpose (why), and explanation (trade-offs) — and remain research documents with suggested code, not implementation instructions.

---

## PART 16 — Chat-log mining: everything learned from the actual chat logs & session DBs (2026-09-17)

**User request:** *"now hwen you are completely done with all of your research i want you to take everyhting tha tyou have learned, that you have placed in this chat log (and that means making sure that you look at the actually chat log files and dbs etc and make sure that you interpret record and and save everything nicely in the promtps and plans folder. )"*

### What was done
1. **Mined 20 transcript `.jsonl` files** (311 user messages) from the VS Code Copilot chat transcripts directory, using a new reusable script `scripts/mine-transcripts.mjs` that extracts verbatim user prompts + assistant summaries.
2. **Queried the session DB** via `session_store_sql` — 30+ sessions with turn counts and summaries.
3. **Authored 4 new docs:**
   - `research/9router/49-chat-log-mining-report.md` — the full mining report (what was mined, the research method's 4 variants, key verbatim user prompts, interpretation, deliverables).
   - `research/9router/50-chat-log-session-index.md` — browsable session index + the 8-phase research arc.
   - `tracking/learnings/2026-09-17-chat-log-mining.md` — transcript format, session DB schema, turn-count divergence.
   - `tracking/decisions/ADR-012-chat-log-mining.md` — chat-log mining as a first-class knowledge source.
4. **Updated** `40-binary-tree-expansion-report.md` (final stats: 193 roots / 24511 nodes / 242852 searches) and `39-binary-tree-expansion-master-plan.md` (execution items 10 done, 11 not run).
5. **Updated indexes:** `tracking/FINDINGS.md`, `tracking/DECISIONS.md`, `tracking/CHANGELOG.md`, `tracking/SESSION-NARRATIVE.md`.

### Key interpretation
- The user's research method is a **signature**: deep research → binary-tree expansion (6 levels) → verbatim recording → unlimited implementation plans → research-only mode → meta-capture of the process itself.
- The chat logs reveal the **process knowledge** (method, decisions, tooling gotchas) that the artifacts alone don't capture.
- The research tree is **frozen at 193 roots** per the user's "when you are completely done" framing; Tier 2 (top-200 corpus roots) remains optional.

**Status:** Chat-log mining complete. All knowledge from the actual chat logs and session DBs is now recorded in `docs/plans-and-prompts/`.

---

## PART 17 — Routing Exponential Expansion: the N-ary clarification (2026-09-17 → 2026-09-19)

**User clarification (verbatim):** *"when you say per program and when i say a binary tree expansion i am referencing that your not just building one single binary tree or nodes specifically you are making sure that for everything that you research from one document (and you can have more than one that you start with) and for every phrase that you decide i want to learn more about in that document that for each of those phrases you go at least 6 levels deep and for each level you may find hundreds of more phrases you want to research and then you will go and research each of those. and from that level you would have 4 more levels left you could go from that level worth of hundreds of phrases you could decide to research on each level so it would be exponential not just a 1 to 2 to 4 to 8 etc kind of research tree. so make sure that you do this ....if you have not already then do it now"*

### The gap discovered
The main routing research (doc `37-ai-model-routing-deep-research.md` + branches `41`–`48`) had ONLY the strict binary tree (193 roots, 24,511 nodes, 242,852 searches — frozen per the user's "completely done" framing). The governance family (E01–E26) and webhook family (R01–R48) both already had full exponential N-ary master maps + expansion docs. **The routing family was the missing piece** — this is exactly what the user's clarification targeted.

### What was done
1. **Created the master map** `research/9router/2026-09-17-routing-exponential-master-map.md` — enumerates **60 roots (R01–R60)** from the routing research: R01–R19 from doc 37, R20–R25 from branch 41, R26–R33 from branch 42, R34–R36 from branch 43, R37–R41 from branch 44, R42–R45 from branch 45, R46–R49 from branch 46, R50–R57 from branch 47, R58–R60 from branch 48. Additive to the binary trees (the spine); this is the full exponential body.
2. **Authored 61 expansion docs** `research/9router/2026-09-17-routing-exp-*.md` (R01–R61), each with:
   - L1 — sub-phrases discovered in the root (4–12 items)
   - L2 — expansion of each L1 node (3–10 each)
   - L3–L6 — continuing expansion with variable N-ary branching (numbered 1a/1a-i/1a-i-a/1a-i-a-1/1a-i-a-1-i)
   - Confidence & open questions + Sources (arXiv IDs + branch doc refs)
3. **R16 naming conflict resolved:** master map defined R16 as "Universal decision pipeline" but an earlier draft created R16 as "Wu's LLM Router" — renamed Wu's router to **R61** and created the proper R16.
4. **Updated indexes:** master map status table (12 batches → ✅), `research/README.md` (routing exponential family added), `tracking/CHANGELOG.md` (2026-09-19 entry), this PART 17.

### Verification (terminal, 2026-09-19)
- `ls 2026-09-17-routing-exp-*.md | wc -l` → **61** (R01–R60 + R61)
- Format audit: **61/61 docs have L1–L6 + Confidence + Sources sections** (grep-verified per file)

### Scale of the exponential
- With average branching 4: 60 × (4^6 − 1)/3 ≈ 60 × 1,365 ≈ **81,900 nodes**
- With branching 6: 60 × 9,331 ≈ **560,000 nodes**
- This is the "crazy exponential" the user asked for — not 1→2→4→8.

**Status:** Routing exponential expansion complete — 61 docs, all format-verified. The routing family now matches the governance (E01–E26) and webhook (R01–R48) families.
