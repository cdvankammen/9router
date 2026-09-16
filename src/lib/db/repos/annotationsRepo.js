// Annotations + saved views repo (plan M4).
// message_annotations: per-message tags / stars / notes.
// saved_views: named filter presets for the Messages page.
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const VALID_KINDS = new Set(["tag", "star", "note"]);

function nowIso() {
  return new Date().toISOString();
}

// ── message_annotations ────────────────────────────────────────────────────

/**
 * List annotations for a message (or conversation).
 * @param {object} opts { requestId?, conversationId? }
 * @returns {Promise<Array<{id, requestId, conversationId, kind, value, createdAt}>>}
 */
export async function getAnnotations({ requestId, conversationId } = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (requestId) {
    conds.push("request_id = ?");
    params.push(requestId);
  }
  if (conversationId) {
    conds.push("conversation_id = ?");
    params.push(conversationId);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = db.all(
    `SELECT id, request_id, conversation_id, kind, value, created_at
     FROM message_annotations ${where}
     ORDER BY created_at DESC, id DESC`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    conversationId: r.conversation_id,
    kind: r.kind,
    value: r.value,
    createdAt: r.created_at,
  }));
}

/**
 * Add or update an annotation (upsert by request_id+kind+value).
 * @param {object} input { requestId, conversationId?, kind, value }
 * @returns {Promise<{id, requestId, conversationId, kind, value, createdAt}>}
 */
export async function addAnnotation({ requestId, conversationId, kind, value }) {
  if (!requestId) throw new Error("requestId is required");
  if (!VALID_KINDS.has(kind)) throw new Error(`Invalid annotation kind: ${kind}`);
  if (typeof value !== "string" || !value.trim()) throw new Error("value is required");
  const trimmed = value.trim().slice(0, 500);
  const db = await getAdapter();
  const createdAt = nowIso();
  db.run(
    `INSERT INTO message_annotations(request_id, conversation_id, kind, value, created_at)
     VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(request_id, kind, value) DO UPDATE SET
       conversation_id = excluded.conversation_id,
       created_at = excluded.created_at`,
    [requestId, conversationId || null, kind, trimmed, createdAt],
  );
  const row = db.get(
    `SELECT id, request_id, conversation_id, kind, value, created_at
     FROM message_annotations WHERE request_id = ? AND kind = ? AND value = ?`,
    [requestId, kind, trimmed],
  );
  return {
    id: row.id,
    requestId: row.request_id,
    conversationId: row.conversation_id,
    kind: row.kind,
    value: row.value,
    createdAt: row.created_at,
  };
}

/**
 * Remove an annotation by id (or by request_id+kind+value).
 * @param {object} input { id? } or { requestId, kind, value }
 * @returns {Promise<boolean>} true if a row was deleted
 */
export async function deleteAnnotation({ id, requestId, kind, value } = {}) {
  const db = await getAdapter();
  if (id !== undefined) {
    const res = db.run(`DELETE FROM message_annotations WHERE id = ?`, [id]);
    return res?.changes > 0;
  }
  if (requestId && kind && value !== undefined) {
    const res = db.run(
      `DELETE FROM message_annotations WHERE request_id = ? AND kind = ? AND value = ?`,
      [requestId, kind, value],
    );
    return res?.changes > 0;
  }
  throw new Error("deleteAnnotation requires id or (requestId, kind, value)");
}

/**
 * Toggle a star on a message (kind="star", value="1").
 * @returns {Promise<boolean>} true if now starred
 */
export async function toggleStar(requestId, conversationId) {
  const existing = await getAnnotations({ requestId });
  const star = existing.find((a) => a.kind === "star");
  if (star) {
    await deleteAnnotation({ id: star.id });
    return false;
  }
  await addAnnotation({ requestId, conversationId, kind: "star", value: "1" });
  return true;
}

// ── saved_views ────────────────────────────────────────────────────────────

/**
 * List saved views (newest first).
 * @returns {Promise<Array<{id, name, filter, createdAt, updatedAt}>>}
 */
export async function getSavedViews() {
  const db = await getAdapter();
  const rows = db.all(
    `SELECT id, name, filter, created_at, updated_at
     FROM saved_views ORDER BY updated_at DESC, id DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    filter: parseJson(r.filter, {}),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Create or update a saved view (upsert by name).
 * @param {object} input { name, filter } — filter is a plain object of
 *   /api/messages query params (provider, model, status, hasTools, ...).
 * @returns {Promise<{id, name, filter, createdAt, updatedAt}>}
 */
export async function saveView({ name, filter }) {
  if (!name || typeof name !== "string" || !name.trim()) throw new Error("name is required");
  const trimmedName = name.trim().slice(0, 100);
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
    throw new Error("filter must be an object");
  }
  const db = await getAdapter();
  const ts = nowIso();
  db.run(
    `INSERT INTO saved_views(name, filter, created_at, updated_at)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       filter = excluded.filter,
       updated_at = excluded.updated_at`,
    [trimmedName, stringifyJson(filter), ts, ts],
  );
  const row = db.get(`SELECT id, name, filter, created_at, updated_at FROM saved_views WHERE name = ?`, [trimmedName]);
  return {
    id: row.id,
    name: row.name,
    filter: parseJson(row.filter, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete a saved view by id or name.
 * @returns {Promise<boolean>} true if a row was deleted
 */
export async function deleteSavedView({ id, name } = {}) {
  const db = await getAdapter();
  if (id !== undefined) {
    const res = db.run(`DELETE FROM saved_views WHERE id = ?`, [id]);
    return res?.changes > 0;
  }
  if (name) {
    const res = db.run(`DELETE FROM saved_views WHERE name = ?`, [name]);
    return res?.changes > 0;
  }
  throw new Error("deleteSavedView requires id or name");
}