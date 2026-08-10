"use client";

/**
 * Shared message formatting helpers — used by both the Messages page
 * (client) and the export API route (server). Keeping these in one module
 * prevents the curl/markdown/pretty logic from drifting between the two.
 *
 * Note: this module is imported by a route handler (server) AND a client
 * component. The functions are pure (no hooks, no browser APIs), so the
 * "use client" directive is safe for the page import and the route import
 * treats it as a normal module.
 */

/** Pretty-print an object (or stringify a non-object). */
export function prettyJson(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

/**
 * Reconstruct a cURL command for a captured request.
 * The capture path never stores the upstream URL, so we emit a placeholder
 * endpoint as a usable template. Truncated payloads are detected and noted.
 */
export function buildCurl(detail) {
  const body = detail.providerRequest || detail.request || {};
  const lines = [`curl -X POST "<provider-endpoint>/v1/chat/completions"`];
  if (body && typeof body === "object" && Object.keys(body).length > 0) {
    lines.push('  -H "Content-Type: application/json"');
    lines.push('  -H "Authorization: Bearer YOUR_API_KEY"');
    if (body._truncated) {
      lines.push(`  # NOTE: original payload was truncated at capture (${body._originalSize || "?"} bytes)`);
      lines.push(`  -d '${JSON.stringify(body._preview || {}, null, 2)}'`);
    } else {
      lines.push(`  -d '${JSON.stringify(body, null, 2)}'`);
    }
  }
  lines.push("");
  lines.push(`# Provider: ${detail.provider}`);
  lines.push(`# Model: ${detail.model}`);
  lines.push(`# Account: ${detail.connectionId || "unknown"}`);
  return lines.join(" \\\n");
}

/** Extract plain text from a content value of any shape (string/array/blocks). */
export function extractText(content, depth = 0) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (depth > 10) return ""; // guard against deep/circular structures
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b?.text) return b.text;
        if (b?.content) return extractText(b.content, depth + 1);
        return "";
      })
      .join("\n");
  }
  return "";
}

/** Render a captured request as a Markdown transcript. */
export function buildMarkdown(detail) {
  const out = [];
  out.push(`## ${detail.timestamp || "unknown"} — ${detail.provider || "unknown"}/${detail.model || "unknown"} [${detail.status || "unknown"}]`);
  out.push("");
  if (detail.conversationId) out.push(`- **Conversation:** \`${detail.conversationId}\``);
  if (detail.connectionId) out.push(`- **Account:** \`${detail.connectionId}\``);
  if (detail.errorCategory) out.push(`- **Category:** \`${detail.errorCategory}\``);
  const lat = detail.latency;
  if (lat) out.push(`- **Latency:** ttft=${lat.ttft ?? "?"}ms total=${lat.total ?? "?"}ms`);
  const tok = detail.tokens;
  if (tok) out.push(`- **Tokens:** in=${tok.prompt_tokens ?? tok.input_tokens ?? "?"} out=${tok.completion_tokens ?? tok.output_tokens ?? "?"}`);
  out.push("");
  const reqMsgs = detail.request?.messages || detail.request?.input || [];
  if (reqMsgs.length) {
    out.push("### Request");
    out.push("```json");
    out.push(JSON.stringify(reqMsgs, null, 2));
    out.push("```");
    out.push("");
  }
  const content = detail.response?.content || detail.providerResponse?.content;
  if (content) {
    out.push("### Response");
    out.push(extractText(content));
    out.push("");
  }
  const err = detail.response?.error;
  if (err) {
    out.push("### Error");
    out.push(typeof err === "string" ? err : JSON.stringify(err, null, 2));
    out.push("");
  }
  return out.join("\n");
}
