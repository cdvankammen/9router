// Migration 004: message_annotations + saved_views — user-curated metadata
// for the Messages page (plan M4).
//
// message_annotations: per-message user annotations (tags, stars, notes).
//   - request_id: FK to requestDetails (cascade delete with retention cap)
//   - conversation_id: denormalized so conversation-level annotations can be
//     queried without a join (a note on a conversation applies to all its
//     messages)
//   - kind: "tag" | "star" | "note" (validated in annotationsRepo)
//   - value: tag name / star flag ("1") / note text
//   - UNIQUE(request_id, kind, value): a tag can only be applied once per
//     message; a message has at most one star; notes are unique per message
//     (upsert semantics in the repo)
//
// saved_views: named filter presets for the Messages page.
//   - filter: JSON of the /api/messages query params (provider, model,
//     status, errorCategory, sourceApp, clientTool, ide, hasTools, ...)
//   - UNIQUE(name): upsert by name

export default {
  version: 4,
  name: "message-annotations",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS message_annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT NOT NULL REFERENCES requestDetails(id) ON DELETE CASCADE,
        conversation_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('tag', 'star', 'note')),
        value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(request_id, kind, value)
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_annotations_request ON message_annotations(request_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_annotations_conversation ON message_annotations(conversation_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_annotations_kind ON message_annotations(kind)`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        filter TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    console.log("[DB][migrate:004] message_annotations + saved_views tables created");
  },
};