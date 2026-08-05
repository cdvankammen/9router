import { NextResponse } from "next/server";
import { getRequestDetails } from "@/lib/db/repos/requestDetailsRepo.js";

export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 5000;

/**
 * GET /api/export/requests?format=json|markdown&provider=...&model=...&conversationId=...&startDate=...&endDate=...&status=...
 *
 * Exports captured request details (when observability is enabled) as JSON
 * or a markdown report grouped by conversation. All filters are optional.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const pageSize = Math.min(Number(url.searchParams.get("limit") || 1000), MAX_EXPORT_ROWS);

    const filter = {
      provider: url.searchParams.get("provider") || undefined,
      model: url.searchParams.get("model") || undefined,
      conversationId: url.searchParams.get("conversationId") || undefined,
      status: url.searchParams.get("status") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
    };

    // Strip undefined keys so repo defaults apply cleanly
    for (const k of Object.keys(filter)) {
      if (filter[k] === undefined) delete filter[k];
    }

    const { details, pagination } = await getRequestDetails({ ...filter, pageSize });

    if (format === "markdown") {
      const md = renderMarkdown(details);
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="9router-requests-${new Date().toISOString().slice(0, 10)}.md"`,
        },
      });
    }

    return NextResponse.json({ details, pagination });
  } catch (error) {
    console.error("[export] Failed to export requests:", error);
    return NextResponse.json({ error: "Failed to export requests" }, { status: 500 });
  }
}

/** Render request details as a markdown report grouped by conversation. */
function renderMarkdown(details) {
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
