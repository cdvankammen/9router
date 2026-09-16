// Migration 003: message_facets — capture-time facet extraction for the
// Messages page (ADR-010 Option 4 hybrid: extract-and-index hot path).
//
// requestDetails.data is a JSON blob; filtering on arbitrary fields meant
// json_extract at query time (slow, no index). This table denormalizes the
// top ~15 dimensions users actually filter on at CAPTURE time, so filtering
// is indexed and pagination-correct, and facet counts (GROUP BY) are fast.
//
// The table is a 1:1 companion to requestDetails (request_id PK/FK). Rows are
// written in the same transaction as the requestDetails insert (see
// requestDetailsRepo.flushToDatabase) and deleted when the retention cap
// drops the parent row (ON DELETE CASCADE).
//
// request_params keeps the OPTIONAL_PARAMS subset (temperature, tools,
// response_format, ...) as JSON for the long tail — the JSON-path query
// language (M2) still reads the full `data` blob via JSON1.

export default {
  version: 3,
  name: "message-facets",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS message_facets (
        request_id TEXT PRIMARY KEY REFERENCES requestDetails(id) ON DELETE CASCADE,
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
        request_params TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Indexes for the hot filter paths (each matches a /api/messages param).
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_latency ON message_facets(latency_ms)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_tokens ON message_facets(prompt_tokens, completion_tokens)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_cost ON message_facets(cost_usd)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_flags ON message_facets(has_tools, has_thinking, truncated)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_identity ON message_facets(source_app, client_tool, ide)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_error ON message_facets(error_category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facets_created ON message_facets(created_at)`);

    console.log("[DB][migrate:003] message_facets table + indexes created");
  },
};