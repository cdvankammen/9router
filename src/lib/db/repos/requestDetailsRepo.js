import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { extractText } from "@/shared/messageFormats.js";

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
  const { where, searchMode } = await buildWhere(filter, conds, params);

  const cntRow = db.get(`SELECT COUNT(*) as c FROM requestDetails ${where}`, params);
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
        `SELECT id, timestamp, data FROM requestDetails ${keysetWhere} ${ORDER_SQL} LIMIT ?`,
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
        `SELECT id, timestamp, data FROM requestDetails ${where} ${ORDER_SQL} LIMIT ? OFFSET ?`,
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
      `SELECT id, timestamp, data FROM requestDetails ${where} ${ORDER_SQL} LIMIT ? OFFSET ?`,
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
  const { where } = await buildWhere(filter, conds, params);

  const countGroup = async (expr) => {
    const rows = db.all(
      `SELECT ${expr} AS value, COUNT(*) AS c FROM requestDetails ${where} GROUP BY ${expr} ORDER BY c DESC LIMIT 20`,
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
    `SELECT timestamp, status FROM requestDetails ${histWhere}`,
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
 * Shared WHERE-builder for getRequestDetails / getRequestFacets.
 * Mutates conds/params (caller-owned), returns { where, searchMode }.
 * Async because the FTS probe + MATCH need the adapter.
 */
async function buildWhere(filter, conds, params) {
  let searchMode;
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
  return { where: conds.length ? `WHERE ${conds.join(" AND ")}` : "", searchMode };
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
  const { where } = await buildWhere({ ...filter, conversationId: undefined }, conds, params);

  // Totals for pagination: distinct conversations in the filtered set.
  const totalRow = db.get(
    `SELECT COUNT(DISTINCT COALESCE(conversationId, '(none)')) AS c FROM requestDetails ${where}`,
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
     FROM requestDetails ${where}
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
  await buildWhere({ ...filter, conversationId: undefined }, conds, params);

  const pageSize = Math.min(filter.pageSize || 500, 500); // safety cap
  const offset = ((filter.page || 1) - 1) * pageSize;

  const rows = db.all(
    `SELECT data FROM requestDetails WHERE ${conds.join(" AND ")} ORDER BY timestamp ASC, id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return rows.map((r) => parseJson(r.data, {}));
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
