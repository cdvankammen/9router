/**
 * Shared markdown report renderer for request details.
 * Used by: /api/export/requests (manual export) and markdownLog.js (auto-flush).
 */

// SECURITY (#298): Redact sensitive fields from request/response objects
// before writing to markdown. The auto-flush writes to ~/.9router/logs/ on
// disk — without redaction, API keys, bearer tokens, and authorization
// headers end up in files that may be world-readable.
//
// Key matching is case-insensitive. Redaction is recursive (handles nested
// objects like request.headers or response.error.details).
const REDACT_KEYS = new Set([
  "authorization", "proxy-authorization", "cookie", "set-cookie",
  "x-api-key", "x-goog-api-key", "api-key", "apikey", "api_key",
  "access_token", "accesstoken", "refresh_token", "refreshtoken",
  "token", "secret", "client_secret", "clientsecret",
  "password", "passwd", "pass",
  "private-token", "private_token",
  "x-session-id", "x-9r-cli-token",
]);

function redactSecrets(value, depth = 0) {
  if (depth > 10 || value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(v => redactSecrets(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACT_KEYS.has(k.toLowerCase()) && typeof v === "string" && v) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactSecrets(v, depth + 1);
    }
  }
  return out;
}

/** Render request details as a markdown report grouped by conversation. */
export function renderRequestsMarkdown(details) {
  const lines = [];
  lines.push(`# 9Router Request Export`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total requests: ${details.length}`);
  lines.push("");

  // Group by conversationId, then timestamp
  const byConversation = new Map();
  for (const d of details) {
    const key = d.conversationId || "no-conversation";
    if (!byConversation.has(key)) byConversation.set(key, []);
    byConversation.get(key).push(d);
  }

  // Order conversation sections chronologically by their EARLIEST request
  // (details arrive newest-first from getRequestDetails).
  const convOrder = [...byConversation.keys()].sort((a, b) => {
    const aMin = Math.min(...byConversation.get(a).map((r) => new Date(r.timestamp).getTime()));
    const bMin = Math.min(...byConversation.get(b).map((r) => new Date(r.timestamp).getTime()));
    return aMin - bMin;
  });

  for (const convId of convOrder) {
    const rows = byConversation.get(convId);
    lines.push(`## Conversation: \`${convId}\``);
    lines.push("");
    for (const row of rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))) {
      const status = row.status || "unknown";
      const model = row.model || "unknown";
      const provider = row.provider || "unknown";
      const latency = row.latency ? `ttft=${row.latency.ttft ?? "?"}ms total=${row.latency.total ?? "?"}ms` : "latency=n/a";
      const tokens = row.tokens
        ? `in=${row.tokens.prompt_tokens ?? row.tokens.input_tokens ?? "?"} out=${row.tokens.completion_tokens ?? row.tokens.output_tokens ?? "?"}`
        : "tokens=n/a";

      lines.push(`### ${row.timestamp} — ${provider}/${model} [${status}]`);
      lines.push("");
      lines.push(`- ${latency}`);
      lines.push(`- ${tokens}`);
      if (row.connectionId) lines.push(`- account: \`${row.connectionId}\``);
      if (row.errorCategory) lines.push(`- category: \`${row.errorCategory}\``);

      const error = row.response?.error;
      if (error) {
        lines.push("");
        lines.push(`**Error:** ${typeof error === "string" ? error : JSON.stringify(error)}`);
      }

      if (row.request && typeof row.request === "object") {
        // SECURITY (#298): redact auth headers, API keys, tokens before export
        const safeRequest = redactSecrets(row.request);
        if (safeRequest?.messages?.length) {
          lines.push("");
          lines.push("<details><summary>Request messages</summary>");
          lines.push("");
          lines.push("```json");
          lines.push(JSON.stringify(safeRequest.messages, null, 2));
          lines.push("```");
          lines.push("</details>");
        }
        // Include redacted headers if present (useful for debugging, safe to export)
        if (safeRequest.headers && Object.keys(safeRequest.headers).length > 0) {
          lines.push("");
          lines.push("<details><summary>Request headers</summary>");
          lines.push("");
          lines.push("```json");
          lines.push(JSON.stringify(safeRequest.headers, null, 2));
          lines.push("```");
          lines.push("</details>");
        }
      }

      if (row.providerResponse && typeof row.providerResponse === "object") {
        // SECURITY (#298): redact tokens/secrets that may appear in provider responses
        const safeResponse = redactSecrets(row.providerResponse);
        lines.push("");
        lines.push("<details><summary>Provider response</summary>");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(safeResponse, null, 2));
        lines.push("```");
        lines.push("</details>");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
