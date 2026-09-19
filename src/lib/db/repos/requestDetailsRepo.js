import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { extractText } from "@/lib/extractText.js";
import { saveRequestStats } from "./requestStatsRepo.js";

const DEFAULT_MAX_RECORDS = 200;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_JSON_SIZE = 5 * 1024;
const CONFIG_CACHE_TTL_MS = 5000;

let cachedConfig = null;
let cachedConfigTs = 0;

// Cumulative count of requestDetails dropped because the maxRecords cap was
// exceeded (in-process; reset on server restart). Exposed via the
// observability status API so the UI can surface silent data loss.
let droppedRecordsCount = 0;

export function getDroppedRecordsCount() {
  return droppedRecordsCount;
}

async function getObservabilityConfig() {
  if (cachedConfig && (Date.now() - cachedConfigTs) < CONFIG_CACHE_TTL_MS) return cachedConfig;
  try {
    const { getSettings } = await import("./settingsRepo.js");
    const settings = await getSettings();
    const envRequestLogs = process.env.ENABLE_REQUEST_LOGS;
    if (envRequestLogs !== undefined) {
      const enabled = envRequestLogs.toLowerCase() === "true";
      cachedConfig = {
        enabled,
        maxRecords: settings.observabilityMaxRecords || parseInt(process.env.OBSERVABILITY_MAX_RECORDS || String(DEFAULT_MAX_RECORDS), 10),
        batchSize: settings.observabilityBatchSize || parseInt(process.env.OBSERVABILITY_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10),
        flushIntervalMs: settings.observabilityFlushIntervalMs || parseInt(process.env.OBSERVABILITY_FLUSH_INTERVAL_MS || String(DEFAULT_FLUSH_INTERVAL_MS), 10),
        maxJsonSize: (settings.observabilityMaxJsonSize || parseInt(process.env.OBSERVABILITY_MAX_JSON_SIZE || "5", 10)) * 1024,
      };
      cachedConfigTs = Date.now();
      return cachedConfig;
    }
    const envFallback = process.env.OBSERVABILITY_ENABLED !== "false";
    const uiFlag = typeof settings.enableObservability === "boolean";
    const enabled = uiFlag
      ? settings.enableObservability
      : envFallback;

    cachedConfig = {
      enabled,
      maxRecords: settings.observabilityMaxRecords || parseInt(process.env.OBSERVABILITY_MAX_RECORDS || String(DEFAULT_MAX_RECORDS), 10),
      batchSize: settings.observabilityBatchSize || parseInt(process.env.OBSERVABILITY_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10),
      flushIntervalMs: settings.observabilityFlushIntervalMs || parseInt(process.env.OBSERVABILITY_FLUSH_INTERVAL_MS || String(DEFAULT_FLUSH_INTERVAL_MS), 10),
      maxJsonSize: (settings.observabilityMaxJsonSize || parseInt(process.env.OBSERVABILITY_MAX_JSON_SIZE || "5", 10)) * 1024,
    };
  } catch {
    cachedConfig = {
      enabled: false,
      maxRecords: DEFAULT_MAX_RECORDS,
      batchSize: DEFAULT_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      maxJsonSize: DEFAULT_MAX_JSON_SIZE,
    };
  }
  cachedConfigTs = Date.now();
  return cachedConfig;
}

let writeBuffer = [];
let flushTimer = null;
let isFlushing = false;

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const sensitiveKeys = ["authorization", "x-api-key", "cookie", "token", "api-key"];
  const sanitized = { ...headers };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) delete sanitized[key];
  }
  return sanitized;
}

export const __test__ = { sanitizeHeaders };

function generateDetailId(model) {
  const timestamp = new Date().toISOString();
  const random = Math.random().toString(36).substring(2, 8);
  const modelPart = model ? model.replace(/[^a-zA-Z0-9-]/g, "-") : "unknown";
  return `${timestamp}-${random}-${modelPart}`;
}

function truncateField(obj, maxSize) {
  const str = JSON.stringify(obj || {});
  if (str.length > maxSize) {
    return { _truncated: true, _originalSize: str.length, _preview: str.substring(0, 200) };
  }
  return obj || {};
}

// ── Facet extraction (ADR-010 Option 4 hot path) ───────────────────────────
// Denormalize the top ~15 filterable dimensions from a captured detail at
// capture time into message_facets. FAIL-OPEN: any error returns a zeroed
// facet row so capture can never be broken by facet extraction.
//
// Field sources (see research §A):
//   has_tools/tool_count      — request.tools (array) or request.tool_choice
//   has_thinking/thinking_tokens — request.thinking/reasoning + tokens.thinking_tokens
//   image_count               — messages[] content parts with type image_url/image
//   truncated                 — any _truncated flag on request/providerRequest/response
//   latency_ms                — latency.total
//   prompt/completion_tokens  — tokens.prompt_tokens/completion_tokens
//   cost_usd                  — detail.cost
//   source_app                — detail.sourceApp
//   client_tool/ide           — detail.clientTool/detail.ide (M3; absent on legacy rows)
//   error_category            — detail.errorCategory
//   request_params            — OPTIONAL_PARAMS subset of request (temperature,
//                               tools, response_format, ...) for the long tail
const FACET_OPTIONAL_PARAMS = [
  "temperature", "top_p", "top_k",
  "max_tokens", "max_completion_tokens",
  "thinking", "reasoning", "enable_thinking",
  "presence_penalty", "frequency_penalty",
  "seed", "stop", "tools", "tool_choice",
  "response_format", "prediction", "store", "metadata",
  "n", "logprobs", "top_logprobs", "logit_bias",
  "user", "parallel_tool_calls"
];

export function extractFacets(detail) {
  try {
    const request = detail.request || {};
    const tokens = detail.tokens || {};
    const latency = detail.latency || {};

    // Tools: request.tools array (OpenAI/Anthropic) or tool_choice object.
    const tools = Array.isArray(request.tools) ? request.tools : [];
    const hasTools = tools.length > 0 || !!request.tool_choice;

    // Thinking: request.thinking/reasoning/enable_thinking flags or
    // tokens.thinking_tokens > 0.
    const thinkingRequested = !!(request.thinking || request.reasoning || request.enable_thinking);
    const thinkingTokens = tokens.thinking_tokens || 0;
    const hasThinking = thinkingRequested || thinkingTokens > 0;

    // Images: count content parts with type image_url/image across messages.
    let imageCount = 0;
    const messages = Array.isArray(request.messages) ? request.messages : [];
    for (const msg of messages) {
      const content = msg?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part && (part.type === "image_url" || part.type === "image")) imageCount += 1;
        }
      }
    }

    // Truncation: any _truncated flag on the captured blobs.
    const truncated = !!(request._truncated || detail.providerRequest?._truncated || detail.response?._truncated);

    // request_params: OPTIONAL_PARAMS subset (JSON for the long tail).
    const requestParams = {};
    for (const p of FACET_OPTIONAL_PARAMS) {
      if (request[p] !== undefined) requestParams[p] = request[p];
    }

    return {
      has_tools: hasTools ? 1 : 0,
      tool_count: tools.length,
      has_thinking: hasThinking ? 1 : 0,
      thinking_tokens: thinkingTokens,
      image_count: imageCount,
      truncated: truncated ? 1 : 0,
      latency_ms: Math.round(latency.total || 0),
      prompt_tokens: tokens.prompt_tokens || 0,
      completion_tokens: tokens.completion_tokens || 0,
      cost_usd: typeof detail.cost === "number" ? detail.cost : 0,
      source_app: detail.sourceApp || null,
      client_tool: detail.clientTool || null,
      ide: detail.ide || null,
      error_category: detail.errorCategory || null,
      request_params: Object.keys(requestParams).length ? stringifyJson(requestParams) : null,
    };
  } catch {
    return {
      has_tools: 0, tool_count: 0, has_thinking: 0, thinking_tokens: 0,
      image_count: 0, truncated: 0, latency_ms: 0, prompt_tokens: 0,
      completion_tokens: 0, cost_usd: 0, source_app: null, client_tool: null,
      ide: null, error_category: null, request_params: null,
    };
  }
}

// ── Full-text search (FTS5 with LIKE fallback) ──────────────────────────────
// Search over captured request payloads. When the SQLite build supports FTS5
// (better-sqlite3 / node:sqlite / bun:sqlite all ship it), we maintain a
// lightweight `requestDetails_fts` virtual table — id + metadata + extracted
// text — and MATCH against it. sql.js has NO FTS5 extension ("no such module:
// fts5"), so on that driver we fall back to LIKE over the JSON blob.
// The probe result is cached for the process lifetime.
let ftsAvailable = null; // null = untested, true/false after first probe

const FTS_TABLE = "requestDetails_fts";
const FTS_CREATE_SQL = `CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(id UNINDEXED, conversationId, provider, model, status, content)`;

/** Probe FTS5 support once (CREATE fails on sql.js) and cache the result. */
async function ensureFtsTable(db) {
  if (ftsAvailable !== null) return ftsAvailable;
  try {
    db.run(FTS_CREATE_SQL);
    ftsAvailable = true;
  } catch (e) {
    ftsAvailable = false;
    console.warn(`[requestDetailsRepo] FTS5 unavailable (${e.message}) — search falls back to LIKE`);
  }
  return ftsAvailable;
}

/**
 * Lightweight text extraction for the FTS index: request message text +
 * response text (+ thinking + error), capped so one huge row can't balloon
 * the index. The full fidelity lives in `data`; this is just searchable text.
 */
function extractFtsContent(record) {
  const parts = [];
  const reqMsgs = record.request?.messages || record.request?.input;
  if (Array.isArray(reqMsgs)) {
    for (const msg of reqMsgs) {
      if (msg?.content != null) parts.push(extractText(msg.content));
    }
  }
  const resp = record.response?.content || record.providerResponse?.choices?.[0]?.message?.content;
  if (resp != null) parts.push(extractText(resp));
  if (record.response?.thinking) parts.push(String(record.response.thinking));
  const err = record.response?.error;
  if (err) parts.push(typeof err === "string" ? err : JSON.stringify(err));
  return parts.join("\n").slice(0, 20000);
}

/**
 * Turn a raw search term into an FTS5 MATCH phrase, or null when the term
 * can't be used with FTS (empty / single-char / operator-only → caller uses
 * LIKE). FTS5 operator chars ( * : " ^ ~ ( ) [ ] { } ) are stripped so a
 * user-typed query can never produce an FTS syntax error, then the remainder
 * is wrapped in double quotes to match as a literal phrase.
 */
export function sanitizeFtsTerm(term) {
  const cleaned = String(term || "")
    .replace(/["*:^~()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2) return null;
  return `"${cleaned}"`;
}

/**
 * LIKE fallback condition (also used for short/operator-heavy terms and on
 * drivers without FTS5). `%`/`_`/`\` in the term are escaped so they match
 * literally. Exported for tests.
 */
export function buildLikeCondition(term) {
  const escaped = String(term || "").replace(/[\\%_]/g, (m) => "\\" + m);
  const like = `%${escaped}%`;
  return {
    cond: `(provider LIKE ? ESCAPE '\\' OR model LIKE ? ESCAPE '\\' OR data LIKE ? ESCAPE '\\' OR conversationId LIKE ? ESCAPE '\\')`,
    param: like,
    mode: "like",
  };
}

/**
 * Build the search WHERE fragment: prefers FTS5 MATCH (id subquery), falls
 * back to LIKE. Returns { cond, params, mode } where mode is "fts" | "like".
 */
async function getSearchCondition(term) {
  const like = buildLikeCondition(term);
  const ftsTerm = sanitizeFtsTerm(term);
  if (!ftsTerm) return { ...like, params: Array(4).fill(like.param) }; // 4 placeholders
  const db = await getAdapter();
  if (!(await ensureFtsTable(db))) return { ...like, params: Array(4).fill(like.param) };
  try {
    return {
      cond: `id IN (SELECT id FROM ${FTS_TABLE} WHERE ${FTS_TABLE} MATCH ?)`,
      params: [ftsTerm],
      mode: "fts",
    };
  } catch (e) {
    // Belt-and-braces: a MATCH failure (weird term on some tokenizer) → LIKE.
    return { ...like, params: Array(4).fill(like.param) };
  }
}

async function flushToDatabase() {
  if (isFlushing) return;
  if (writeBuffer.length === 0) return;
  isFlushing = true;
  try {
    // Drain entire buffer (loop in case more pushed during await)
    while (writeBuffer.length > 0) {
      const items = writeBuffer.splice(0, writeBuffer.length);
      const db = await getAdapter();
      const config = await getObservabilityConfig();
      // Resolve FTS support BEFORE the transaction: probing (CREATE VIRTUAL
      // TABLE) must not run inside the sync transaction body.
      const fts = await ensureFtsTable(db);

      db.transaction(() => {
        for (const item of items) {
          if (!item.id) item.id = generateDetailId(item.model);
          if (!item.timestamp) item.timestamp = new Date().toISOString();
          if (item.request?.headers) item.request.headers = sanitizeHeaders(item.request.headers);

          const record = {
            id: item.id,
            provider: item.provider || null,
            model: item.model || null,
            connectionId: item.connectionId || null,
            timestamp: item.timestamp,
            status: item.status || null,
            latency: item.latency || {},
            tokens: item.tokens || {},
            request: truncateField(item.request, config.maxJsonSize),
            providerRequest: truncateField(item.providerRequest, config.maxJsonSize),
            providerResponse: truncateField(item.providerResponse, config.maxJsonSize),
            response: truncateField(item.response, config.maxJsonSize),
            pxpipe: item.pxpipe || undefined,
            conversationId: item.conversationId || null,
            errorCategory: item.errorCategory || null,
            sourceApp: item.sourceApp || undefined,
            userAgent: item.userAgent || undefined,
            // Upstream URL captured at request time (task B4) — used by
            // buildCurl for the exported cURL command. Absent on legacy rows.
            url: item.url || undefined,
            // Per-request cost capture (computed in buildRequestDetail) —
            // carried in `data` so the Messages page + conversation
            // aggregates can render it. Absent on legacy rows.
            cost: typeof item.cost === "number" ? item.cost : undefined,
            costProvenance: item.costProvenance || undefined,
            pricingModel: item.pricingModel || undefined,
          };

          db.run(
            `INSERT INTO requestDetails(id, timestamp, provider, model, connectionId, status, data, conversationId) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, provider = excluded.provider, model = excluded.model, connectionId = excluded.connectionId, status = excluded.status, data = excluded.data, conversationId = excluded.conversationId`,
            [record.id, record.timestamp, record.provider, record.model, record.connectionId, record.status, stringifyJson(record), record.conversationId]
          );

          // Facet row (ADR-010 hot path): denormalized filterable dimensions,
          // written in the same transaction so facets never drift from the
          // parent row. ON CONFLICT upsert keeps re-captures consistent.
          const facets = extractFacets(record);
          db.run(
            `INSERT INTO message_facets(request_id, has_tools, tool_count, has_thinking, thinking_tokens, image_count, truncated, latency_ms, prompt_tokens, completion_tokens, cost_usd, source_app, client_tool, ide, error_category, request_params, created_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(request_id) DO UPDATE SET
               has_tools = excluded.has_tools, tool_count = excluded.tool_count,
               has_thinking = excluded.has_thinking, thinking_tokens = excluded.thinking_tokens,
               image_count = excluded.image_count, truncated = excluded.truncated,
               latency_ms = excluded.latency_ms, prompt_tokens = excluded.prompt_tokens,
               completion_tokens = excluded.completion_tokens, cost_usd = excluded.cost_usd,
               source_app = excluded.source_app, client_tool = excluded.client_tool,
               ide = excluded.ide, error_category = excluded.error_category,
               request_params = excluded.request_params`,
            [record.id, facets.has_tools, facets.tool_count, facets.has_thinking, facets.thinking_tokens,
             facets.image_count, facets.truncated, facets.latency_ms, facets.prompt_tokens,
             facets.completion_tokens, facets.cost_usd, facets.source_app, facets.client_tool,
             facets.ide, facets.error_category, facets.request_params, record.timestamp]
          );

          // Keep the FTS index in sync (delete+insert = upsert; FTS5 has no
          // UNIQUE constraint to target with ON CONFLICT).
          if (fts) {
            db.run(`DELETE FROM ${FTS_TABLE} WHERE id = ?`, [record.id]);
            db.run(
              `INSERT INTO ${FTS_TABLE}(id, conversationId, provider, model, status, content) VALUES(?, ?, ?, ?, ?, ?)`,
              [record.id, record.conversationId, record.provider, record.model, record.status, extractFtsContent(record)]
            );
          }
        }

        const cnt = db.get(`SELECT COUNT(*) as c FROM requestDetails`);
        if (cnt && cnt.c > config.maxRecords) {
          const dropCount = cnt.c - config.maxRecords;
          droppedRecordsCount += dropCount;
          db.run(
            `DELETE FROM requestDetails WHERE id IN (SELECT id FROM requestDetails ORDER BY timestamp ASC LIMIT ?)`,
            [dropCount]
          );
          // Facet rows are FK-cascaded (PRAGMA foreign_keys=ON), but the
          // sql.js fallback may not enforce FKs — clean explicitly so facets
          // never outlive their parent row.
          db.run(`DELETE FROM message_facets WHERE request_id NOT IN (SELECT id FROM requestDetails)`);
          // Retention janitor: purge the same ids from the FTS index. The
          // NOT IN form is the safest — it also repairs any drift from
          // earlier bugs (e.g. rows deleted while FTS was unavailable).
          if (fts) {
            db.run(`DELETE FROM ${FTS_TABLE} WHERE id NOT IN (SELECT id FROM requestDetails)`);
          }
        }
      });
    }
  } catch (e) {
    console.error("[requestDetailsRepo] Batch write failed:", e);
  } finally {
    isFlushing = false;
  }
}

export async function saveRequestDetail(detail) {
  // Shared id feeds both the observability row (upsert across stream
  // start/complete) and the stats row (one per request). Generate it here so
  // the stats write — which runs unconditionally, independent of the
  // observability toggle — sees a stable key.
  if (!detail.id) detail.id = generateDetailId(detail.model);
  saveRequestStats(detail).catch((e) => console.error("[requestStats] save failed:", e.message));

  const config = await getObservabilityConfig();
  if (!config.enabled) {return;}

  writeBuffer.push(detail);

  // Trigger immediate flush if batch threshold reached.
  // flushToDatabase() drains entire buffer in a loop, so all pushes during await are persisted.
  if (writeBuffer.length >= config.batchSize) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushToDatabase().catch((e) => console.error("[requestDetailsRepo] flush err:", e));
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushToDatabase().catch(() => {});
    }, config.flushIntervalMs);
  }
}

// ── Keyset pagination helpers ──────────────────────────────────────────────
// Opaque cursor: base64url("timestamp|id") of the last row of the previous
// page. Ordering is (timestamp DESC, id DESC) — id breaks ties for rows with
// identical timestamps (a real risk with batch writes and coarse clocks).
function encodeCursor(timestamp, id) {
  return Buffer.from(`${timestamp}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(String(cursor), "base64url").toString("utf8");
    const sep = raw.indexOf("|");
    if (sep <= 0 || sep === raw.length - 1) return null;
    return { timestamp: raw.slice(0, sep), id: raw.slice(sep + 1) };
  } catch {
    return null;
  }
}

export async function getRequestDetails(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  const { where, searchMode, join } = await buildWhere(filter, conds, params);

  const cntRow = db.get(`SELECT COUNT(*) as c FROM requestDetails ${join} ${where}`, params);
  const totalItems = cntRow ? cntRow.c : 0;

  const pageSize = filter.pageSize || 50;
  const totalPages = Math.ceil(totalItems / pageSize);
  const ORDER_SQL = `ORDER BY timestamp DESC, id DESC`;

  let rows;
  let page = filter.page || 1;
  let nextCursor = null;

  if (filter.cursor) {
    // Keyset pagination: opaque cursor from the last row of the previous
    // page. Stable under inserts (no OFFSET scan, no page drift).
    const decoded = decodeCursor(filter.cursor);
    if (decoded) {
      const keysetWhere = conds.length
        ? `${where} AND (timestamp < ? OR (timestamp = ? AND id < ?))`
        : `WHERE (timestamp < ? OR (timestamp = ? AND id < ?))`;
      // Fetch pageSize+1 rows to know definitively whether a next page
      // exists (hasNext) and to build the next cursor.
      const raw = db.all(
        `SELECT id, timestamp, data FROM requestDetails ${join} ${keysetWhere} ${ORDER_SQL} LIMIT ?`,
        [...params, decoded.timestamp, decoded.timestamp, decoded.id, pageSize + 1]
      );
      rows = raw.slice(0, pageSize);
      if (raw.length > pageSize) {
        const last = rows[rows.length - 1];
        nextCursor = encodeCursor(last.timestamp, last.id);
      }
    } else {
      // Unparseable cursor → fall back to offset math (page 1).
      page = 1;
      rows = db.all(
        `SELECT id, timestamp, data FROM requestDetails ${join} ${where} ${ORDER_SQL} LIMIT ? OFFSET ?`,
        [...params, pageSize, 0]
      );
      // Still anchor a valid next cursor so the UI can switch to keyset on
      // the next page ("Load more") even after a bad cursor.
      if (rows.length > 0 && page < totalPages) {
        const last = rows[rows.length - 1];
        nextCursor = encodeCursor(last.timestamp, last.id);
      }
    }
  } else {
    // Page-number mode (backward compat with the page-number UI). Uses the
    // same (timestamp DESC, id DESC) order as keyset so both agree. The
    // returned page also anchors a nextCursor so callers can chain into
    // keyset pagination on the following page.
    const offset = (page - 1) * pageSize;
    rows = db.all(
      `SELECT id, timestamp, data FROM requestDetails ${join} ${where} ${ORDER_SQL} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    if (rows.length > 0 && page < totalPages) {
      const last = rows[rows.length - 1];
      nextCursor = encodeCursor(last.timestamp, last.id);
    }
  }

  const details = rows.map((r) => parseJson(r.data, {}));

  return {
    details,
    pagination: {
      page, pageSize, totalItems, totalPages,
      // In keyset mode `page` stays 1 (the cursor defines position), so
      // hasNext must be driven by nextCursor alone; page-number mode keeps
      // the classic comparison.
      hasNext: filter.cursor ? nextCursor !== null : page < totalPages,
      hasPrev: page > 1,
    },
    // Opaque cursor for the next keyset page (null when no more rows). The
    // UI can pass it back as ?cursor= for drift-free forward pagination.
    nextCursor,
    // "fts" when the query used the FTS5 index, "like" for the LIKE
    // fallback, undefined when no search term was given. Surfaced by the API
    // so the UI can show which mode served the results.
    searchMode,
  };
}

export async function getDistinctProviders() {
  const db = await getAdapter();
  const rows = db.all(`SELECT DISTINCT provider FROM requestDetails WHERE provider IS NOT NULL ORDER BY provider ASC`);
  return rows.map((r) => r.provider);
}

/**
 * Facet counts + 24h histogram for the messages page — computed in SQL with
 * GROUP BY instead of fetching full records (a 10k-row fetch of JSON blobs was
 * tens of MB per page load and truncated counts past 10k).
 *
 * @param {object} filter same shape as getRequestDetails (provider, model,
 *   status, conversationId, startDate, endDate, errorCategory, sourceApp)
 * @returns {Promise<{facets: object, histogram: Array}>}
 */
export async function getRequestFacets(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  const { where, join } = await buildWhere(filter, conds, params);
  // The facet groups below ALWAYS reference f.* columns (client_tool, ide,
  // has_tools, …), so message_facets must be joined unconditionally — not
  // only when a facet filter is active. message_facets is a 1:1 companion
  // (request_id PK), so the JOIN never multiplies rows.
  const facetsJoin = join || "JOIN message_facets f ON f.request_id = requestDetails.id";

  const countGroup = async (expr) => {
    const rows = db.all(
      `SELECT ${expr} AS value, COUNT(*) AS c FROM requestDetails ${facetsJoin} ${where} GROUP BY ${expr} ORDER BY c DESC LIMIT 20`,
      params
    );
    return rows
      .map((r) => ({ value: r.value ?? "unknown", count: r.c }))
      .filter((r) => r.value !== null);
  };

  const facets = {
    provider: await countGroup("provider"),
    model: await countGroup("model"),
    status: await countGroup("status"),
    errorCategory: await countGroup("json_extract(data, '$.errorCategory')"),
    sourceApp: await countGroup("json_extract(data, '$.sourceApp')"),
    // M1 facet groups — from the indexed message_facets table.
    clientTool: await countGroup("f.client_tool"),
    ide: await countGroup("f.ide"),
    hasTools: await countGroup("f.has_tools"),
    hasThinking: await countGroup("f.has_thinking"),
    truncated: await countGroup("f.truncated"),
  };

  // Histogram: last 24h, hourly buckets (UTC), errors counted separately.
  // Anchor at the START of the current hour so the current partial hour has a
  // bucket (a naive [now-24h, now) window keyed by hour drops every row that
  // arrived in the current hour — its key falls past the last bucket).
  const now = Date.now();
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const start = hourStart.getTime() - 23 * 60 * 60 * 1000; // 23 full + current = 24
  const histWhere = where ? `${where} AND timestamp >= ?` : `WHERE timestamp >= ?`;
  const rows = db.all(
    `SELECT timestamp, status FROM requestDetails ${facetsJoin} ${histWhere}`,
    [...params, new Date(start).toISOString()]
  );
  const buckets = new Map();
  for (let h = 0; h < 24; h++) {
    const ts = new Date(start + h * 60 * 60 * 1000);
    const key = ts.toISOString().slice(0, 13) + ":00";
    buckets.set(key, { label: ts.toISOString().slice(11, 16), count: 0, errors: 0 });
  }
  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    if (t < start || t > now) continue;
    const key = new Date(t).toISOString().slice(0, 13) + ":00";
    const b = buckets.get(key);
    if (!b) continue;
    b.count += 1;
    if (r.status === "error") b.errors += 1;
  }

  return { facets, histogram: [...buckets.values()] };
}

/**
 * Parse a JSON-path query string into a safe SQL fragment.
 *
 * Grammar (ADR-010 long tail, M2):
 *   <path> <op> <value>
 *   <path>            — dot/bracket path into the `data` blob, e.g.
 *                       `latency.total`, `request.tools`, `tokens.prompt_tokens`
 *   <op>              — one of: = != > >= < <= (whitelisted)
 *   <value>           — number, string (single-quoted), true/false, null
 *
 * The path is converted to a SQLite JSON1 path expression (`$.latency.total`)
 * and the VALUE is ALWAYS returned as a bound parameter — never interpolated
 * into SQL. Invalid paths/operators return null (filter is ignored).
 *
 * @param {string} raw
 * @returns {{pathExpr: string, op: string, value: (string|number|boolean|null)}|null}
 */
export function parseJsonPathQuery(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 200) return null;

  // <path> <op> <value> — path is [A-Za-z0-9_.\[\]'"]+ (no spaces), op is
  // one of the whitelist, value is the rest.
  const m = trimmed.match(/^([A-Za-z0-9_.\[\]'"]+)\s*(==|!=|>=|<=|>|<|=)\s*(.+)$/);
  if (!m) return null;

  const [, pathRaw, opRaw, valueRaw] = m;
  const op = opRaw === "==" ? "=" : opRaw;
  if (!["=", "!=", ">", ">=", "<", "<="].includes(op)) return null;

  // Path → JSON1 path expression. Support dot notation (latency.total) and
  // bracket notation (request['tools']). Reject anything that could escape
  // the path string (quotes, semicolons, comments).
  if (/[;"']/.test(pathRaw.replace(/\[['"]|['"]\]/g, ""))) return null;
  const pathExpr = pathRaw
    .replace(/\[['"]([^'"]+)['"]\]/g, ".$1") // request['tools'] → request.tools
    .replace(/\./g, ".")
    .replace(/^\./, "");
  if (!pathExpr || pathExpr.length > 100) return null;
  const jsonPath = `$.${pathExpr}`;

  // Value: number, boolean, null, or single-quoted string. Never interpolate.
  let value;
  if (valueRaw === "true") value = true;
  else if (valueRaw === "false") value = false;
  else if (valueRaw === "null") value = null;
  else if (/^-?\d+(\.\d+)?$/.test(valueRaw)) value = Number(valueRaw);
  else if (/^'[^']*'$/.test(valueRaw)) value = valueRaw.slice(1, -1);
  else return null;

  return { pathExpr: jsonPath, op, value };
}

/**
 * Shared WHERE-builder for getRequestDetails / getRequestFacets.
 * Mutates conds/params (caller-owned), returns { where, searchMode, join }.
 * Async because the FTS probe + MATCH need the adapter.
 */
async function buildWhere(filter, conds, params) {
  let searchMode;
  let needsFacetsJoin = false;
  if (filter.search) {
    const sc = await getSearchCondition(filter.search);
    conds.push(sc.cond);
    params.push(...sc.params);
    searchMode = sc.mode;
  }
  if (filter.provider) { conds.push("provider = ?"); params.push(filter.provider); }
  if (filter.model) { conds.push("model = ?"); params.push(filter.model); }
  if (filter.connectionId) { conds.push("connectionId = ?"); params.push(filter.connectionId); }
  if (filter.status) { conds.push("status = ?"); params.push(filter.status); }
  if (filter.conversationId) { conds.push("conversationId = ?"); params.push(filter.conversationId); }
  // Explicit null → rows with no conversation (the "(none)" group). A falsy
  // undefined means "no conversation filter".
  else if (filter.conversationId === null) { conds.push("conversationId IS NULL"); }
  if (filter.startDate) { conds.push("timestamp >= ?"); params.push(new Date(filter.startDate).toISOString()); }
  if (filter.endDate) { conds.push("timestamp <= ?"); params.push(new Date(filter.endDate).toISOString()); }
  if (filter.errorCategory) { conds.push(`json_extract(data, '$.errorCategory') = ?`); params.push(filter.errorCategory); }
  if (filter.sourceApp) { conds.push(`json_extract(data, '$.sourceApp') = ?`); params.push(filter.sourceApp); }

  // ── Facet filters (ADR-010 hot path, M1) ────────────────────────────────
  // Backed by the message_facets table (indexed columns) so filtering is
  // fast and pagination-correct. Each maps 1:1 to a /api/messages param.
  // When any facet filter is present, the caller must JOIN message_facets
  // (the returned `join` clause) — the `f.` prefix disambiguates columns.
  if (filter.latencyMin !== undefined) { conds.push("f.latency_ms >= ?"); params.push(Number(filter.latencyMin)); needsFacetsJoin = true; }
  if (filter.latencyMax !== undefined) { conds.push("f.latency_ms <= ?"); params.push(Number(filter.latencyMax)); needsFacetsJoin = true; }
  if (filter.tokensMin !== undefined) { conds.push("(f.prompt_tokens + f.completion_tokens) >= ?"); params.push(Number(filter.tokensMin)); needsFacetsJoin = true; }
  if (filter.tokensMax !== undefined) { conds.push("(f.prompt_tokens + f.completion_tokens) <= ?"); params.push(Number(filter.tokensMax)); needsFacetsJoin = true; }
  if (filter.costMin !== undefined) { conds.push("f.cost_usd >= ?"); params.push(Number(filter.costMin)); needsFacetsJoin = true; }
  if (filter.costMax !== undefined) { conds.push("f.cost_usd <= ?"); params.push(Number(filter.costMax)); needsFacetsJoin = true; }
  if (filter.hasTools !== undefined) { conds.push("f.has_tools = ?"); params.push(filter.hasTools ? 1 : 0); needsFacetsJoin = true; }
  if (filter.hasThinking !== undefined) { conds.push("f.has_thinking = ?"); params.push(filter.hasThinking ? 1 : 0); needsFacetsJoin = true; }
  if (filter.truncated !== undefined) { conds.push("f.truncated = ?"); params.push(filter.truncated ? 1 : 0); needsFacetsJoin = true; }
  if (filter.clientTool) { conds.push("f.client_tool = ?"); params.push(filter.clientTool); needsFacetsJoin = true; }
  if (filter.ide) { conds.push("f.ide = ?"); params.push(filter.ide); needsFacetsJoin = true; }

  // ── JSON-path query (ADR-010 long tail, M2) ─────────────────────────────
  // Arbitrary queries on the `data` blob via SQLite JSON1. The path and
  // operator are validated/whitelisted by parseJsonPathQuery — the VALUE is
  // always a bound parameter (never string-interpolated), so this is
  // injection-safe. Composable with every other filter above.
  if (filter.jsonPath) {
    const parsed = parseJsonPathQuery(filter.jsonPath);
    if (parsed) {
      conds.push(`json_extract(data, ?) ${parsed.op} ?`);
      params.push(parsed.pathExpr, parsed.value);
    }
  }

  const join = needsFacetsJoin
    ? "JOIN message_facets f ON f.request_id = requestDetails.id"
    : "";
  return { where: conds.length ? `WHERE ${conds.join(" AND ")}` : "", searchMode, join };
}

export async function getRequestDetailById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT data FROM requestDetails WHERE id = ?`, [id]);
  return row ? parseJson(row.data, null) : null;
}

// ── Conversation aggregation (B3) ──────────────────────────────────────────
// Aggregates are computed in SQL (GROUP BY) over the FULL filtered dataset,
// not over the current page's rows — so conversation counts/tokens/cost are
// correct for conversations that span multiple pages, and the UI can page
// through conversations without losing a session thread.

/**
 * Per-conversation aggregates over the full filtered dataset.
 *
 * Same filter contract as getRequestDetails, EXCEPT conversationId (grouping
 * happens BY conversation, so a conversation filter would collapse the
 * query). Rows with NULL conversationId group under "(none)".
 *
 * @param {object} filter provider/model/status/startDate/endDate/search/…
 *   plus page/pageSize for paginating the conversation LIST
 * @returns {Promise<{conversations: Array, pagination: object, totals: object}>}
 *   conversations: [{ conversationId, messageCount, tokens:{prompt,completion},
 *   cost, lastTimestamp, firstTimestamp }] ordered by lastTimestamp DESC
 */
export async function getConversationSummary(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  const { where, join } = await buildWhere({ ...filter, conversationId: undefined }, conds, params);

  // Totals for pagination: distinct conversations in the filtered set.
  const totalRow = db.get(
    `SELECT COUNT(DISTINCT COALESCE(conversationId, '(none)')) AS c FROM requestDetails ${join} ${where}`,
    params
  );
  const totalItems = totalRow ? totalRow.c : 0;

  const page = filter.page || 1;
  const pageSize = filter.pageSize || 50;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;

  // Token sums mirror the JS fallback used by the Messages page
  // (prompt_tokens || input_tokens) so Claude-style rows count too.
  const rows = db.all(
    `SELECT COALESCE(conversationId, '(none)') AS conversationKey,
            COUNT(*) AS messageCount,
            COALESCE(SUM(COALESCE(json_extract(data, '$.tokens.prompt_tokens'), json_extract(data, '$.tokens.input_tokens'))), 0) AS promptTokens,
            COALESCE(SUM(COALESCE(json_extract(data, '$.tokens.completion_tokens'), json_extract(data, '$.tokens.output_tokens'))), 0) AS completionTokens,
            COALESCE(SUM(COALESCE(json_extract(data, '$.cost'), 0)), 0) AS cost,
            MAX(timestamp) AS lastTimestamp,
            MIN(timestamp) AS firstTimestamp
     FROM requestDetails ${join} ${where}
     GROUP BY COALESCE(conversationId, '(none)')
     ORDER BY lastTimestamp DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    conversations: rows.map((r) => ({
      conversationId: r.conversationKey === "(none)" ? null : r.conversationKey,
      messageCount: r.messageCount,
      tokens: { prompt: r.promptTokens, completion: r.completionTokens },
      cost: r.cost,
      lastTimestamp: r.lastTimestamp,
      firstTimestamp: r.firstTimestamp,
    })),
    pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    totals: { conversationCount: totalItems },
  };
}

/**
 * All rows for one conversation, ASC by timestamp — a FULL session thread
 * regardless of the page window. Pass conversationId=null for the "(none)"
 * group (rows with no conversation).
 *
 * @param {string|null} conversationId conversation key, or null for the
 *   no-conversation group
 * @param {object} filter other filters (provider/status/dates/search/…) plus
 *   page/pageSize; pageSize is capped at 500 for safety
 * @returns {Promise<Array>} parsed requestDetails.data rows, ASC
 */
export async function getConversationMessages(conversationId, filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (conversationId === null || conversationId === undefined) {
    conds.push("conversationId IS NULL");
  } else {
    conds.push("conversationId = ?");
    params.push(conversationId);
  }
  const { join } = await buildWhere({ ...filter, conversationId: undefined }, conds, params);

  const pageSize = Math.min(filter.pageSize || 500, 500); // safety cap
  const offset = ((filter.page || 1) - 1) * pageSize;

  const rows = db.all(
    `SELECT data FROM requestDetails ${join} WHERE ${conds.join(" AND ")} ORDER BY timestamp ASC, id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return rows.map((r) => parseJson(r.data, {}));
}

// ── Error Inbox aggregation (P2) ───────────────────────────────────────────
// Server-side fingerprint grouping over the FULL filtered set — the BoardView
// groups by a client-side fingerprint over the page window only, which
// undercounts errors that span pages. The coarse Sentry-style key
// (provider|model|errorCategory) keeps tiny error-text variations from
// fragmenting groups; error text is DISPLAY ONLY, never part of the key.

/** Group key columns for the error aggregation (provider, model, JSON1 category). */
const ERROR_GROUP_EXPRS = "provider, model, json_extract(data, '$.errorCategory')";

/**
 * Aggregate connection IDs for an error group. Returns a comma-separated list
 * of distinct connection IDs that contributed to this group, plus the count
 * of distinct connections. Used by the provider detail UI to show which
 * connections are affected by each error category.
 */
const ERROR_CONNECTION_IDS_EXPR = "GROUP_CONCAT(DISTINCT connectionId)";

/**
 * Stable coarse fingerprint for an error group: provider|model|errorCategory.
 * This is the key used for triage persistence (settings `boardColumns` map),
 * so it must stay stable across message-text variations. 'unknown' fills null
 * members so the key is deterministic regardless of capture completeness.
 *
 * @param {string|null|undefined} provider upstream provider id
 * @param {string|null|undefined} model upstream model id
 * @param {string|null|undefined} errorCategory categorizeError output
 * @returns {string} `${provider}|${model}|${errorCategory}`
 */
export function errorFingerprint(provider, model, errorCategory) {
  return `${provider || "unknown"}|${model || "unknown"}|${errorCategory || "unknown"}`;
}

/**
 * Error-fingerprint aggregates over the full filtered dataset (Error Inbox P2).
 *
 * Same filter contract as getConversationSummary, EXCEPT status is forced to
 * 'error' — the inbox IS the error view, so a stale/omitted status filter can
 * never widen the set to successes. Grouping happens in SQL (window
 * functions over the raw rows AFTER the WHERE, so every filter — including
 * JSON1 errorCategory/startDate/endDate — is honored before aggregation) and
 * each group's representative row is its LATEST record (timestamp DESC, id
 * DESC), whose id becomes `detailId` for drill-in.
 *
 * @param {object} filter provider/model/errorCategory/startDate/endDate/
 *   sourceApp/search/… plus page/pageSize for paginating the group LIST
 * @returns {Promise<{errors: Array, pagination: object, totals: object}>}
 *   errors: [{ fingerprint, provider, model, errorCategory, count,
 *   firstTimestamp, lastTimestamp, cost, sampleError, detailId }] ordered by
 *   count DESC, lastTimestamp DESC
 */
export async function getErrorSummary(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  const { where, join } = await buildWhere({ ...filter, status: "error" }, conds, params);
  // Always join message_facets so each group can report whether ANY of its
  // rows was truncated at capture time (M6 badge). buildWhere already joins
  // when a facet filter is active — reuse that clause instead of duplicating.
  const facetsJoin = join || "JOIN message_facets f ON f.request_id = requestDetails.id";

  // Totals for pagination: distinct fingerprint groups in the filtered set.
  const totalRow = db.get(
    `SELECT COUNT(*) AS c FROM (SELECT 1 FROM requestDetails ${facetsJoin} ${where} GROUP BY ${ERROR_GROUP_EXPRS})`,
    params
  );
  const totalItems = totalRow ? totalRow.c : 0;

  const page = filter.page || 1;
  const pageSize = filter.pageSize || 50;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;

  // Window functions over the filtered rows: COUNT/MIN/MAX/SUM span the whole
  // partition (the group), ROW_NUMBER picks the latest row as the group's
  // representative (carries `detailId` + the live row's fields). COALESCE
  // keeps display strings stable so the JS fingerprint matches triage keys.
  // Connection IDs are aggregated via GROUP_CONCAT(DISTINCT) in a subquery
  // so each group shows which connections contributed errors.
  const rows = db.all(
    `SELECT provider, model, errorCategory, count, firstTimestamp, lastTimestamp, cost, sampleError, detailId, truncated, connectionIds
     FROM (
       SELECT
         COALESCE(provider, 'unknown') AS provider,
         COALESCE(model, 'unknown') AS model,
         COALESCE(json_extract(data, '$.errorCategory'), 'unknown') AS errorCategory,
         COUNT(*) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}) AS count,
         MIN(timestamp) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}) AS firstTimestamp,
         MAX(timestamp) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}) AS lastTimestamp,
         COALESCE(SUM(COALESCE(json_extract(data, '$.cost'), 0)) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}), 0) AS cost,
         MIN(json_extract(data, '$.response.error')) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}) AS sampleError,
         MAX(COALESCE(f.truncated, 0)) OVER (PARTITION BY ${ERROR_GROUP_EXPRS}) AS truncated,
         id AS detailId,
         ROW_NUMBER() OVER (PARTITION BY ${ERROR_GROUP_EXPRS} ORDER BY timestamp DESC, id DESC) AS rn,
         (
           SELECT GROUP_CONCAT(connectionId, ',')
           FROM (
             SELECT DISTINCT connectionId
             FROM requestDetails r2
             WHERE r2.provider = requestDetails.provider
               AND r2.model = requestDetails.model
               AND COALESCE(json_extract(r2.data, '$.errorCategory'), 'unknown') = COALESCE(json_extract(requestDetails.data, '$.errorCategory'), 'unknown')
               AND r2.connectionId IS NOT NULL
           )
         ) AS connectionIds
       FROM requestDetails ${facetsJoin} ${where}
     )
     WHERE rn = 1
     ORDER BY count DESC, lastTimestamp DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    errors: rows.map((r) => ({
      fingerprint: errorFingerprint(r.provider, r.model, r.errorCategory),
      provider: r.provider,
      model: r.model,
      errorCategory: r.errorCategory,
      count: r.count,
      firstTimestamp: r.firstTimestamp,
      lastTimestamp: r.lastTimestamp,
      cost: r.cost,
      sampleError: r.sampleError,
      detailId: r.detailId,
      truncated: !!r.truncated,
      connectionIds: r.connectionIds ? r.connectionIds.split(',').filter(Boolean) : [],
    })),
    pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    totals: { errorGroupCount: totalItems },
  };
}

const _shutdownHandler = async () => {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (writeBuffer.length > 0) await flushToDatabase();
};

function ensureShutdownHandler() {
  process.off("beforeExit", _shutdownHandler);
  process.off("SIGINT", _shutdownHandler);
  process.off("SIGTERM", _shutdownHandler);
  process.off("exit", _shutdownHandler);

  process.on("beforeExit", _shutdownHandler);
  process.on("SIGINT", _shutdownHandler);
  process.on("SIGTERM", _shutdownHandler);
  process.on("exit", _shutdownHandler);
}

ensureShutdownHandler();
