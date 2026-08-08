import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";

/**
 * GET /api/messages/:id/export?format=json|markdown|curl
 * Export one captured request in the requested format.
 *
 * - json: normalized full record (importable)
 * - markdown: role-styled transcript (prompt / completion / thinking / error)
 * - curl: reconstructed curl command with auth placeholder
 */
function extractText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b?.text) return b.text;
        if (b?.content) return extractText(b.content);
        return "";
      })
      .join("\n");
  }
  return "";
}

function buildCurl(detail) {
  // The capture path never stores the upstream URL — emit a placeholder
  // endpoint so the curl is usable as a template (matches the page's
  // buildCurl behavior). Detect truncated bodies and note them.
  const url = detail.providerRequest?.url || "https://<your-9router-host>/v1/chat/completions";
  const method = detail.providerRequest?.method || "POST";
  const body = detail.providerRequest?.body || detail.providerRequest || null;
  const lines = [`curl -X ${method} "${url}"`];
  if (body && typeof body === "object") {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -H "Authorization: Bearer YOUR_API_KEY"`);
    if (body._truncated) {
      lines.push(`  # NOTE: original payload was truncated at capture (${body._originalSize || "?"} bytes)`);
      lines.push(`  -d '${JSON.stringify(body._preview || {}, null, 2)}'`);
    } else {
      lines.push(`  -d '${JSON.stringify(body, null, 2)}'`);
    }
  }
  return lines.join(" \\\n");
}

function buildMarkdown(detail) {
  const out = [];
  const ts = detail.timestamp || "unknown";
  const model = detail.model || "unknown";
  const provider = detail.provider || "unknown";
  const status = detail.status || "unknown";

  out.push(`## ${ts} — ${provider}/${model} [${status}]`);
  out.push("");

  if (detail.conversationId) out.push(`- **Conversation:** \`${detail.conversationId}\``);
  if (detail.connectionId) out.push(`- **Account:** \`${detail.connectionId}\``);
  if (detail.errorCategory) out.push(`- **Category:** \`${detail.errorCategory}\``);

  const latency = detail.latency;
  if (latency) {
    out.push(`- **Latency:** ttft=${latency.ttft ?? "?"}ms total=${latency.total ?? "?"}ms`);
  }
  const tokens = detail.tokens;
  if (tokens) {
    out.push(`- **Tokens:** in=${tokens.prompt_tokens ?? tokens.input_tokens ?? "?"} out=${tokens.completion_tokens ?? tokens.output_tokens ?? "?"}`);
  }
  out.push("");

  const reqMessages = detail.request?.messages || detail.request?.input || [];
  if (reqMessages.length > 0) {
    out.push("### Request");
    out.push("");
    out.push("```json");
    out.push(JSON.stringify(reqMessages, null, 2));
    out.push("```");
    out.push("");
  }

  const respContent = detail.response?.content || detail.providerResponse?.content;
  if (respContent) {
    out.push("### Response");
    out.push("");
    out.push(respContent);
    out.push("");
  }

  const error = detail.response?.error;
  if (error) {
    out.push("### Error");
    out.push("");
    out.push(typeof error === "string" ? error : JSON.stringify(error, null, 2));
    out.push("");
  }

  return out.join("\n");
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (format === "markdown") {
      return new NextResponse(buildMarkdown(detail), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    if (format === "curl") {
      return new NextResponse(buildCurl(detail), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // default json
    return NextResponse.json({ ...detail, _id: id });
  } catch (error) {
    console.error("[API] Failed to export message:", error);
    return NextResponse.json({ error: "Failed to export message" }, { status: 500 });
  }
}
