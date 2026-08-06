/**
 * Shared markdown report renderer for request details.
 * Used by: /api/export/requests (manual export) and markdownLog.js (auto-flush).
 */

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

      const error = row.response?.error;
      if (error) {
        lines.push("");
        lines.push(`**Error:** ${typeof error === "string" ? error : JSON.stringify(error)}`);
      }

      if (row.request?.messages?.length) {
        lines.push("");
        lines.push("<details><summary>Request messages</summary>");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(row.request.messages, null, 2));
        lines.push("```");
        lines.push("</details>");
      }

      if (row.providerResponse && typeof row.providerResponse === "object") {
        lines.push("");
        lines.push("<details><summary>Provider response</summary>");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(row.providerResponse, null, 2));
        lines.push("```");
        lines.push("</details>");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
