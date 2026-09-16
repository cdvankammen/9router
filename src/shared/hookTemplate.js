// Pure template-expansion helpers for /api/hooks (plan M5).
// Kept server-safe and side-effect free so it can be unit-tested directly.

/**
 * Build the substitution context from a message detail record.
 * @param {object} detail - requestDetails.data record
 * @param {string} messageId - requestDetails id
 * @returns {object} ctx with string/JSON values for {{field}} expansion
 */
export function buildHookContext(detail, messageId) {
  return {
    id: messageId,
    model: detail.model || "",
    provider: detail.provider || "",
    sourceApp: detail.sourceApp || "",
    conversationId: detail.conversationId || "",
    status: detail.status || "",
    errorCategory: detail.errorCategory || "",
    timestamp: detail.timestamp || "",
    request: JSON.stringify(detail.request || {}),
    response: JSON.stringify(detail.response || {}),
    content: extractText(detail.response?.content || ""),
    prompt: extractText(detail.request?.messages || []),
  };
}

/**
 * Expand {{field}} placeholders in a template string.
 * - Unknown placeholders are left untouched.
 * - When the template looks like JSON (starts with { or [ but not with a
 *   {{ placeholder), values are JSON-encoded; otherwise raw.
 * - In JSON templates, a quoted placeholder ("{{field}}") is replaced with
 *   the JSON value directly (no double-encoding).
 * @param {string} template
 * @param {object} ctx
 * @returns {string}
 */
export function expandTemplate(template, ctx) {
  const str = String(template || "");
  // JSON template heuristic: starts with { or [ but NOT with {{ (a bare
  // placeholder like "{{unknown}} ..." is a text template, not JSON).
  const isJsonTemplate = /^\s*[\[{]/.test(str) && !/^\s*\{\{/.test(str);

  if (isJsonTemplate) {
    // Quoted placeholders first: "{{field}}" → JSON value (no double quotes).
    let out = str.replace(/"\{\{(\w+)\}\}"/g, (match, key) =>
      key in ctx ? JSON.stringify(ctx[key]) : match,
    );
    // Bare placeholders: {{field}} → JSON value.
    out = out.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      key in ctx ? JSON.stringify(ctx[key]) : match,
    );
    return out;
  }

  return str.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in ctx ? String(ctx[key]) : match,
  );
}

/**
 * Extract plain text from message content (string, array of parts, or
 * array of messages).
 */
export function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.content) return extractText(item.content);
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}