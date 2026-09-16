# Message-Driven Tool-Building — Code-Bearing Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #messages #observability #filter #build #record #identity #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, DB adapter API, settings shape, Next.js route conventions, existing repo patterns in `src/lib/db/repos/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation (read before implementing each milestone):
> - `../research/2026-08-31-message-origin-and-destination-research.md` (root)
> - `../research/master-research-tree.md` + `../research/2026-08-31-message-origin-branch-*.md` (16 branches)
> - `../research/master-topic-index.md` + `../research/2026-08-31-topic-t*.md` (26 trees)
> - `../research/exponential-master-map.md` + `../research/2026-08-31-exp-e*.md` (26 exp docs)
> - `../research/message-capture-*.md` (6 docs: deep-research-v2, gaps-and-risks, log-viewing, obscure-projects-v3, v4-deep-pass, message-viewer-design-philosophies)
> - `../interpretation/2026-09-15-message-capture-interpretation-guide.md` + doc-by-doc + synthesis (interpretation layer)

## Scope

**In scope:**
- Make every field of the captured `requestDetails.data` blob a first-class dimension for **Filter / Build / Record / More options**
- Hot-path facet extraction + indexing (Option 3) for the top ~15 dimensions users actually filter on
- Long-tail JSON-path query language (Option 2) for arbitrary queries on `data` via SQLite JSON1
- Identity as a first-class dimension: extend `detectClientTool`, IDE detection, trusted `X-9R-App/User/Session` headers (consuming governance M1's trust model)
- Annotations (tags/star/notes), saved views, per-message actions, webhook/script hooks, conversation-level tooling
- Truncation surfacing in the UI

**Out of scope (v1):**
- Implementing the governance plan's M1 header trust model itself (this plan *consumes* it)
- Visual query builder UI (JSON-path text input + saved views first; builder later)
- Cloud sync of annotations/saved views (local SQLite first)
- Multi-instance/Redis-backed anything (single-node local-first, matching webhook plan)

---

## M1 — Facet extraction + indexing (hot path)

**Goal:** `message_facets` table populated at capture time; fast, pagination-correct filtering; facet counts for UI.

### Reference code

**Migration** (`src/lib/db/migrations/` — new migration file):

```js
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS message_facets (
      request_id TEXT PRIMARY KEY,
      has_tools INTEGER NOT NULL DEFAULT 0,
      tool_count INTEGER NOT NULL DEFAULT 0,
      has_thinking INTEGER NOT NULL DEFAULT 0,
      thinking_tokens INTEGER NOT NULL DEFAULT 0,
      image_count INTEGER NOT NULL DEFAULT 0,
      truncated INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      source_app TEXT,
      client_tool TEXT,
      ide TEXT,
      error_category TEXT,
      request_params TEXT,          -- JSON: model, temperature, max_tokens, stream, etc.
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_facets_latency ON message_facets (latency_ms);
    CREATE INDEX IF NOT EXISTS idx_facets_tokens ON message_facets (prompt_tokens, completion_tokens);
    CREATE INDEX IF NOT EXISTS idx_facets_cost ON message_facets (cost_usd);
    CREATE INDEX IF NOT EXISTS idx_facets_source_app ON message_facets (source_app);
    CREATE INDEX IF NOT EXISTS idx_facets_client_tool ON message_facets (client_tool);
    CREATE INDEX IF NOT EXISTS idx_facets_error ON message_facets (error_category);
  `);
}
export async function down(db) {
  await db.exec(`DROP TABLE IF EXISTS message_facets;`);
}
```

**Facet extraction at capture time** (`src/lib/db/repos/requestDetailsRepo.js` — extend the existing save path):

```js
// Reference sketch — adapt to the actual saveRequestDetail signature.
export function extractFacets(data) {
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  const toolCalls = messages.flatMap((m) => m?.tool_calls ?? []);
  const toolResults = messages.filter((m) => m?.role === "tool");
  const thinking = messages.filter((m) => m?.thinking || m?.reasoning_content);
  const images = messages.flatMap((m) =>
    (m?.content ?? []).filter((c) => c?.type === "image_url" || c?.type === "image")
  );

  return {
    has_tools: toolCalls.length > 0 || toolResults.length > 0 ? 1 : 0,
    tool_count: toolCalls.length + toolResults.length,
    has_thinking: thinking.length > 0 ? 1 : 0,
    thinking_tokens: thinking.reduce((n, m) => n + (m?.thinking_tokens ?? 0), 0),
    image_count: images.length,
    truncated: data?._truncated ? 1 : 0,
    latency_ms: data?.latency?.total ?? 0,
    prompt_tokens: data?.usage?.prompt_tokens ?? 0,
    completion_tokens: data?.usage?.completion_tokens ?? 0,
    cost_usd: data?.cost?.total ?? 0,
    source_app: data?.sourceApp ?? null,
    client_tool: data?.clientTool ?? null,
    ide: data?.ide ?? null,
    error_category: data?.errorCategory ?? null,
    request_params: JSON.stringify({
      model: data?.model, temperature: data?.temperature,
      max_tokens: data?.max_tokens, stream: data?.stream,
    }),
  };
}
```

**API filter params** (`src/app/api/messages/route.js` — extend the existing list handler):

```js
// Reference sketch — add to the existing query builder.
const filters = [];
const params = [];
const add = (sql, v) => { filters.push(sql); params.push(v); };

if (req.nextUrl.searchParams.has("latencyMin")) add("f.latency_ms >= ?", Number(searchParams.get("latencyMin")));
if (req.nextUrl.searchParams.has("latencyMax")) add("f.latency_ms <= ?", Number(searchParams.get("latencyMax")));
if (req.nextUrl.searchParams.has("tokensMin")) add("f.prompt_tokens + f.completion_tokens >= ?", Number(searchParams.get("tokensMin")));
if (req.nextUrl.searchParams.has("tokensMax")) add("f.prompt_tokens + f.completion_tokens <= ?", Number(searchParams.get("tokensMax")));
if (req.nextUrl.searchParams.has("costMin")) add("f.cost_usd >= ?", Number(searchParams.get("costMin")));
if (req.nextUrl.searchParams.has("costMax")) add("f.cost_usd <= ?", Number(searchParams.get("costMax")));
if (req.nextUrl.searchParams.has("hasTools")) add("f.has_tools = ?", searchParams.get("hasTools") === "true" ? 1 : 0);
if (req.nextUrl.searchParams.has("hasThinking")) add("f.has_thinking = ?", searchParams.get("hasThinking") === "true" ? 1 : 0);
if (req.nextUrl.searchParams.has("truncated")) add("f.truncated = ?", searchParams.get("truncated") === "true" ? 1 : 0);
if (req.nextUrl.searchParams.has("clientTool")) add("f.client_tool = ?", searchParams.get("clientTool"));
if (req.nextUrl.searchParams.has("ide")) add("f.ide = ?", searchParams.get("ide"));
if (req.nextUrl.searchParams.has("sourceApp")) add("f.source_app = ?", searchParams.get("sourceApp"));
if (req.nextUrl.searchParams.has("errorCategory")) add("f.error_category = ?", searchParams.get("errorCategory"));

// JOIN facets for filtering, but keep pagination on the main table:
// SELECT ... FROM request_details rd JOIN message_facets f ON f.request_id = rd.id
// WHERE <filters> ORDER BY rd.created_at DESC LIMIT ? OFFSET ?
```

**Files touched:**
- `src/lib/db/migrations/` — new migration: `message_facets` table + indexes
- `src/lib/db/repos/requestDetailsRepo.js` — populate facets at capture time
- `src/app/api/messages/route.js` — new filter params backed by indexed columns

**Acceptance criteria:**
- `message_facets` columns as listed; indexed columns → fast, pagination-correct filtering
- New API params: `latencyMin/Max`, `tokensMin/Max`, `costMin/Max`, `hasTools`, `hasThinking`, `truncated`, `clientTool`, `ide`, `sourceApp`, `errorCategory`
- Facet counts per value (like the error inbox) for a facets UI

---

## M2 — JSON-path query language (long tail)

**Goal:** `?jsonPath=request.tools` / `?jsonPath=latency.total>5000` via SQLite JSON1, injection-safe.

### Reference code

**`src/lib/db/queryParser.js` (new):**

```js
const ALLOWED_OPS = new Set([">", ">=", "<", "<=", "=", "!=", "contains", "exists"]);
const MAX_PATH_LEN = 200;
const MAX_JSONPATH_LEN = 500;

/**
 * Parse `?jsonPath=` into a SQL fragment + params, or throw.
 * Forms:
 *   "request.tools"              → json_extract(data, '$.request.tools') IS NOT NULL
 *   "latency.total>5000"         → json_extract(data, '$.latency.total') > ?
 *   "model=claude-3-5-sonnet"    → json_extract(data, '$.model') = ?
 *   "messages[0].role=user"      → json_extract(data, '$.messages[0].role') = ?
 */
export function parseJsonPath(input) {
  if (typeof input !== "string" || input.length > MAX_JSONPATH_LEN) {
    throw new Error("jsonPath too long");
  }
  const m = input.match(/^([A-Za-z0-9_\[\].-]+)\s*(>=|<=|!=|>|<|=|contains)?\s*(.*)$/);
  if (!m) throw new Error(`invalid jsonPath: ${input}`);
  const [, path, op = "exists", rawValue] = m;
  if (path.length > MAX_PATH_LEN) throw new Error("jsonPath field too long");
  if (!ALLOWED_OPS.has(op)) throw new Error(`unsupported operator: ${op}`);

  // Escape single quotes in the path for the JSON path literal.
  const jsonPath = `$.${path.replace(/'/g, "''")}`;
  const extract = `json_extract(data, '${jsonPath}')`;

  if (op === "exists") return { sql: `${extract} IS NOT NULL`, params: [] };
  if (op === "contains") return { sql: `instr(CAST(${extract} AS TEXT), ?) > 0`, params: [rawValue] };

  // Numeric compare when the value parses as a number, else text compare.
  const num = Number(rawValue);
  const isNum = rawValue !== "" && Number.isFinite(num);
  const param = isNum ? num : rawValue;
  return { sql: `${extract} ${op} ?`, params: [param] };
}
```

**Wiring** (`src/app/api/messages/route.js` — extend the M1 query builder):

```js
// Reference sketch — add to the existing query builder.
const jp = searchParams.get("jsonPath");
if (jp) {
  const { sql, params: jpParams } = parseJsonPath(jp); // throws → 400
  filters.push(sql);
  params.push(...jpParams);
}
```

**Files touched:**
- `src/lib/db/queryParser.js` (new) — small parser + validation
- `src/lib/db/repos/requestDetailsRepo.js` — `jsonPath` filter using SQLite JSON1 (`json_extract`)
- `src/app/api/messages/route.js` — `jsonPath` param

**Acceptance criteria:**
- `?jsonPath=request.tools` / `?jsonPath=latency.total>5000` works
- Parameterized queries only (no string interpolation into SQL) — injection-safe
- Rate-limited / validated (whitelist of operators, field path length cap)
- Composable with existing filters

---

## M3 — Identity as a first-class dimension

**Goal:** `detectClientTool` covers 12+ tools + IDE level; `clientTool`/`ide` filterable server-side; trusted headers consumed post-auth.

### Reference code

**`open-sse/utils/clientDetector.js` — extend `detectClientTool`:**

```js
// Reference sketch — extend the existing detector with governance M1's list.
const TOOL_RULES = [
  { re: /aider/i, tool: "Aider" },
  { re: /cline/i, tool: "Cline" },
  { re: /roo[-_ ]?code/i, tool: "Roo Code" },
  { re: /windsurf/i, tool: "Windsurf" },
  { re: /zed/i, tool: "Zed" },
  { re: /warp/i, tool: "Warp" },
  { re: /continue/i, tool: "Continue" },
  { re: /openrouter/i, tool: "OpenRouter SDK" },
  // ... existing rules (Claude Code, Cursor, Codex CLI, Copilot, etc.)
];

const IDE_RULES = [
  { re: /vscode|visual studio code/i, ide: "VS Code" },
  { re: /jetbrains|intellij|pycharm|webstorm/i, ide: "JetBrains" },
  { re: /neovim|nvim/i, ide: "Neovim" },
  { re: /zed/i, ide: "Zed" },
  { re: /warp/i, ide: "Warp" },
  { re: /terminal|iterm/i, ide: "Terminal" },
];

export function detectClientTool(userAgent = "") {
  const ua = String(userAgent).slice(0, 300);
  for (const { re, tool } of TOOL_RULES) if (re.test(ua)) return tool;
  return "unknown";
}

export function detectIde(userAgent = "") {
  const ua = String(userAgent).slice(0, 300);
  for (const { re, ide } of IDE_RULES) if (re.test(ua)) return ide;
  return "unknown";
}
```

**Trusted headers** (consumes governance M1 — reference sketch):

```js
// After auth (governance M1 trust model), read:
//   X-9R-App, X-9R-User, X-9R-Session
// Only when the request came from a trusted source (loopback / valid API key).
// Never trust these headers from untrusted origins.
```

**Files touched:**
- `open-sse/utils/clientDetector.js` — extend `detectClientTool` + add `detectIde`
- `src/lib/sourceApps.js` — verify existence; add agent rules if missing (24 rules verified 2026-09-15)
- `src/lib/db/repos/requestDetailsRepo.js` — store `client_tool`, `ide` facets

**Acceptance criteria:**
- `detectClientTool` covers 12+ tools + IDE level
- `clientTool` / `ide` filterable server-side
- Trusted `X-9R-App/User/Session` headers consumed post-auth (governance M1 dependency)

---

## M4 — Annotations + saved views

**Goal:** `message_annotations` + `saved_views` tables; CRUD repos; API routes.

### Reference code

**Migration** (`src/lib/db/migrations/` — new migration file):

```js
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS message_annotations (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      conversation_id TEXT,
      kind TEXT NOT NULL CHECK (kind IN ('tag', 'star', 'note')),
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_annotations_request ON message_annotations (request_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_kind ON message_annotations (kind, value);

    CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      filter TEXT NOT NULL,          -- JSON: { params: { ... } }
      created_at INTEGER NOT NULL
    );
  `);
}
export async function down(db) {
  await db.exec(`DROP TABLE IF EXISTS message_annotations; DROP TABLE IF EXISTS saved_views;`);
}
```

**`src/lib/db/repos/annotationsRepo.js` (new):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function addAnnotation({ requestId, conversationId, kind, value }) {
  const db = await getAdapter();
  const id = `ann_${crypto.randomUUID()}`;
  await db.run(
    `INSERT INTO message_annotations (id, request_id, conversation_id, kind, value, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, requestId, conversationId ?? null, kind, value, Date.now()]
  );
  return id;
}

export async function listAnnotations({ requestId, kind } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (requestId) { where.push("request_id = ?"); params.push(requestId); }
  if (kind) { where.push("kind = ?"); params.push(kind); }
  const sql = `SELECT * FROM message_annotations ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
  return db.all(sql, ...params);
}

export async function deleteAnnotation(id) {
  const db = await getAdapter();
  await db.run(`DELETE FROM message_annotations WHERE id = ?`, [id]);
}
```

**`src/lib/db/repos/savedViewsRepo.js` (new):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function createSavedView({ name, filter }) {
  const db = await getAdapter();
  const id = `view_${crypto.randomUUID()}`;
  await db.run(
    `INSERT INTO saved_views (id, name, filter, created_at) VALUES (?, ?, ?, ?)`,
    [id, name, JSON.stringify(filter), Date.now()]
  );
  return id;
}

export async function listSavedViews() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM saved_views ORDER BY created_at DESC`);
}

export async function deleteSavedView(id) {
  const db = await getAdapter();
  await db.run(`DELETE FROM saved_views WHERE id = ?`, [id]);
}
```

**API routes:**
- `src/app/api/messages/[id]/annotations/route.js` (new) — GET list / POST add / DELETE
- `src/app/api/saved-views/route.js` (new) — GET list / POST create / DELETE

**Files touched:**
- `src/lib/db/migrations/` — new migration: `message_annotations` + `saved_views`
- `src/lib/db/repos/annotationsRepo.js` (new)
- `src/lib/db/repos/savedViewsRepo.js` (new)
- `src/app/api/messages/[id]/annotations/route.js` (new)
- `src/app/api/saved-views/route.js` (new)

**Acceptance criteria:**
- `message_annotations`: `request_id`, `conversation_id`, `kind` [tag/star/note], `value`, `created_at`
- `saved_views`: `name`, `filter` JSON, `created_at`
- Retention story: annotations/saved views survive `requestDetails` cap (orphan cleanup or FK cascade — decide in ADR)

---

## M5 — Per-message actions + webhook/script hooks

**Goal:** Action menu backend + webhook/script hook with template expansion.

### Reference code

**`src/app/api/hooks/route.js` (new):**

```js
import { getSettings } from "@/lib/localDb";

// POST /api/hooks  { url, template, messageId }
// Template expansion: {{model}}, {{sourceApp}}, {{conversationId}}, {{prompt}}, {{response}}
export async function POST(req) {
  const body = await req.json();
  const { url, template, messageId } = body;
  if (!url || !template || !messageId) {
    return Response.json({ error: "url, template, messageId required" }, { status: 400 });
  }

  const message = await getMessageForHook(messageId); // from requestDetails repo
  const expanded = String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = message?.data?.[key] ?? message?.[key];
    return v == null ? "" : String(v);
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, text: expanded }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return Response.json({ error: `hook failed: ${res.status}` }, { status: 502 });
  return Response.json({ ok: true });
}
```

**Files touched:**
- `src/app/api/messages/[id]/actions/route.js` (new) — action menu backend
- `src/app/api/hooks/route.js` (new) — webhook/script hook with message-field template expansion
- `src/app/(dashboard)/dashboard/messages/components/` — action menu UI (copy cURL exists, export exists, replay, summarize, send-to-webhook, add-note, tag, alert-on-match)

**Acceptance criteria:**
- Per-message action menu: copy cURL, export, replay, summarize, send-to-webhook, add-note, tag, alert-on-match
- `POST /api/hooks` with template expansion (`{{model}}`, `{{sourceApp}}`, `{{conversationId}}`)
- Webhooks opt-in per message type; never send raw `Authorization` (already stripped)
- Conversation-level: export thread, summarize thread, fork/replay, per-conversation annotations

---

## M6 — Truncation surfacing + UI

**Files touched:**
- `src/app/(dashboard)/dashboard/messages/page.js` + components — surface `_truncated` flag prominently
- `src/app/(dashboard)/dashboard/messages/components/` — facets UI, saved views UI, action menus

**Acceptance criteria:**
- `_truncated` flag visible in list + detail (badge/notice), not silent
- Facets sidebar with counts per value
- Saved views dropdown + apply
- Action menus wired to M5 backend

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Governance M1 (trusted headers, key metadata) | M3's trusted-header part blocked if not implemented | Fallback: UA-only detection |
| `src/lib/sourceApps.js` | Verified 2026-09-15: 24 UA rules exist; agent rules may be missing | Add rules in M3 |
| JSON1 availability | Already used for errorCategory/sourceApp filtering, low risk | sql.js fallback needs LIKE fallback (existing pattern) |
| Retention cap | Annotations/saved views must survive `requestDetails` cap | Orphan cleanup decision needed (ADR) |
| Injection | JSON-path must be parameterized | Whitelist operators; rate-limit; `parseJsonPath` throws on invalid |
| Privacy | Log content is untrusted input | Sanitize before render/analyze (existing `sanitizeHeaders` + `analyze-error` patterns); truncation surfaced not silent |

## Open decisions (from research open questions)

1. **JSON-path exposure** (research Q1): raw text input + saved views first; UI query builder later (out of scope v1).
2. **Facet extraction timing** (research Q2): capture-time (M1) — query-time adds latency; capture-time schema is the committed part.
3. **Annotations storage** (research Q3): local SQLite first; cloud sync deferred (out of scope v1).
4. **Retention story** (research Q4): annotations/saved views survive `requestDetails` cap — orphan cleanup vs FK cascade, decide in implementation (ADR).
5. **Build primitives surface** (research Q5): dashboard-only for v1; CLI/MCP exposure deferred — revisit after M5.

## Verification

- Unit tests: `parseJsonPath` (valid/invalid/injection attempts), `extractFacets` (tools/thinking/images/truncation), annotations + saved views CRUD
- Manual: filter by `jsonPath`, `clientTool`, `truncated`; add tag/star/note; save view; send hook
- Regression: `tests/__baseline__/verify-no-regression.mjs`