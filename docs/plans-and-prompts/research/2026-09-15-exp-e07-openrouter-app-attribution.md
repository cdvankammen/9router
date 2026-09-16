# Exponential Expansion E07 — OpenRouter App Attribution

**Date:** 2026-09-15
**Root phrase:** "OpenRouter app attribution (HTTP-Referer, X-OpenRouter-Title, categories, visibility)" — from `2026-08-31-message-origin-and-destination-research.md` §B.1
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. `HTTP-Referer` header (required)
2. `X-OpenRouter-Title` header
3. `X-OpenRouter-Categories` header
4. `X-OpenRouter-App-Visibility: hidden`
5. Localhost URL requirement
6. Public rankings / per-model Apps tabs / per-app analytics
7. Best practices (URL requirements, title guidelines, privacy)
8. Implementation examples (SDK, Python, TypeScript, fetch, cURL)

## L2 — expansion of each L1 node

### 1. HTTP-Referer (required)
- **1a. Purpose** — identifies the app's URL; primary identifier for rankings.
- **1b. Required** — without it, no app page created, no rankings.
- **1c. Uniqueness** — app URL becomes its unique identifier.
- **1d. Origin grouping** — referer URLs group into apps.

### 2. X-OpenRouter-Title
- **2a. Purpose** — display name in rankings/analytics.
- **2b. Pairing** — must be paired with HTTP-Referer.
- **2c. Legacy alias** — `X-Title` still supported.
- **2d. Localhost** — required for localhost URLs to be tracked.

### 3. X-OpenRouter-Categories
- **3a. Format** — comma-separated list.
- **3b. Max per request** — 2 categories.
- **3c. Max per app** — 10 categories.
- **3d. Validation** — lowercase, hyphen-separated, ≤30 chars each.
- **3e. Unrecognized** — dropped without error.
- **3f. Merge** — merged with existing (up to 10 total).

### 4. X-OpenRouter-App-Visibility: hidden
- **4a. Effect** — app excluded from public rankings/marketplace.
- **4b. Attribution still works** — usage shows in own analytics.
- **4c. First creation only** — applies only when creating a new app.
- **4d. Cannot unhide** — later requests can't change visibility.

### 5. Localhost URL requirement
- **5a. Rule** — localhost URLs require X-OpenRouter-Title.
- **5b. Why** — localhost referers are meaningless without a name.

### 6. Where apps appear
- **6a. Public rankings** — openrouter.ai/rankings; daily/weekly/monthly.
- **6b. Model Apps tabs** — per-model pages show top apps.
- **6c. Per-app analytics** — openrouter.ai/apps?url=<referer>.

### 7. Best practices
- **7a. Always include HTTP-Referer** — minimum requirement.
- **7b. Primary domain** — avoid subdomains unless distinct apps.
- **7c. Localhost** — always include X-OpenRouter-Title.
- **7d. Titles** — concise, descriptive, actual app name.
- **7e. Privacy** — only public apps (sending headers) are in rankings.

### 8. Implementation examples
- **8a. TypeScript SDK** — `@openrouter/sdk` with httpReferer/appTitle/appCategories.
- **8b. Python OpenAI SDK** — extra_headers with HTTP-Referer etc.
- **8c. TypeScript OpenAI SDK** — defaultHeaders.
- **8d. Direct API** — requests/fetch with headers.
- **8e. cURL** — -H flags.

## L3 — expansion of selected L2 nodes

### 1d → origin grouping
- **1d-i. Same origin** — same referer URL = same app.
- **1d-ii. Subdomains** — distinct subdomains = distinct apps (unless grouped).
- **1d-iii. Paths** — paths within a domain group together.

### 3f → category groups
- **3f-i. Coding** — cli-agent, ide-extension, cloud-agent, programming-app, native-app-builder.
- **3f-ii. Creative** — creative-writing, video-gen, image-gen, audio-gen.
- **3f-iii. Productivity** — writing-assistant, general-chat, personal-agent, legal.
- **3f-iv. Entertainment** — roleplay, game.

### 4c → first creation only
- **4c-i. New app** — hidden applies.
- **4c-ii. Existing app** — keeps current visibility.
- **4c-iii. OAuth-created** — prior OAuth authorization keeps visibility.
- **4c-iv. Cannot hide others** — a caller of somebody else's app can't hide it.

### 6c → per-app analytics
- **6c-i. Model usage over time** — charts.
- **6c-ii. Token consumption** — prompt/completion breakdown.
- **6c-iii. Usage patterns** — historical trends.

### 8a → TypeScript SDK
- **8a-i. Constructor** — `new OpenRouter({apiKey, httpReferer, appTitle, appCategories})`.
- **8a-ii. Chat send** — `client.chat.send({chatRequest})`.
- **8a-iii. Streaming** — ReadableStream support.

## L4 — expansion of selected L3 nodes

### 3f-i → coding categories
- **3f-i-a. cli-agent** — terminal-based coding assistants.
- **3f-i-b. ide-extension** — editor/IDE integrations.
- **3f-i-c. cloud-agent** — cloud-hosted coding agents.
- **3f-i-d. programming-app** — programming apps.
- **3f-i-e. native-app-builder** — mobile/desktop app builders.

### 4c-i → new app
- **4c-i-a. First request** — creates the app.
- **4c-i-b. Visibility set** — hidden or public.
- **4c-i-c. Later requests** — header ignored.

### 6c-i → model usage charts
- **6c-i-a. Time range** — daily/weekly/monthly.
- **6c-i-b. Models** — which models the app uses.
- **6c-i-c. Volume** — token totals.

## L5 — expansion of selected L4 nodes

### 3f-i-a → cli-agent
- **3f-i-a-1. Examples** — Claude Code, Codex CLI, Aider.
- **3f-i-a-2. UA** — claude-cli/, codex-cli/.
- **3f-i-a-3. 9router relevance** — these are the local agents hitting the gateway.

### 3f-i-b → ide-extension
- **3f-i-b-1. Examples** — Cursor, Continue, Copilot.
- **3f-i-b-2. UA** — cursor/, continue/, githubcopilot.

### 4c-i-a → first request
- **4c-i-a-1. Detection** — referer URL not seen before.
- **4c-i-a-2. Creation** — app record created.
- **4c-i-a-3. Visibility** — from header or default public.

## L6 — expansion of selected L5 nodes

### 3f-i-a-3 → 9router relevance
- **3f-i-a-3-1. Local agents** — Claude Code, Codex CLI hit 9router.
- **3f-i-a-3-2. Attribution** — 9router could adopt referer-style attribution.
- **3f-i-a-3-3. X-9R-App** — 9router's own header (see E14).

### 3f-i-b-2 → IDE UAs
- **3f-i-b-2-1. Cursor** — cursor/ UA.
- **3f-i-b-2-2. Continue** — continue/ UA.
- **3f-i-b-2-3. Copilot** — githubcopilot UA.

## Confidence & open questions

- **Confidence: high** — fetched live from openrouter.ai/docs/app-attribution.
- **Open:** should 9router adopt referer-style attribution for its own dashboard?
- **Open:** should 9router expose X-9R-App as an analog of X-OpenRouter-Title?

## Sources

- https://openrouter.ai/docs/app-attribution (fetched 2026-09-15)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.1