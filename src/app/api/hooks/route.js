import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { buildHookContext, expandTemplate, extractText } from "@/shared/hookTemplate";
import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * POST /api/hooks
 * Send a message (or conversation) to a webhook/script URL with template
 * expansion of message fields.
 *
 * Body:
 * {
 *   messageId: string,            // requestDetails id
 *   url: string,                  // webhook URL (http/https)
 *   template?: string,            // optional JSON template with {{field}} placeholders
 *   headers?: object,             // optional extra headers (never Authorization)
 *   timeoutMs?: number            // default 10000
 * }
 *
 * Template expansion ({{model}}, {{sourceApp}}, {{conversationId}}, ...):
 *   - {{model}}            → detail.model
 *   - {{provider}}         → detail.provider
 *   - {{sourceApp}}        → detail.sourceApp
 *   - {{conversationId}}   → detail.conversationId
 *   - {{status}}           → detail.status
 *   - {{errorCategory}}    → detail.errorCategory
 *   - {{timestamp}}        → detail.timestamp
 *   - {{request}}          → JSON of detail.request
 *   - {{response}}         → JSON of detail.response
 *   - {{content}}          → extracted text of the response content
 *   - {{prompt}}           → extracted text of the request messages
 *   - {{id}}               → message id
 *
 * Security:
 *   - Never sends raw Authorization (stripped from headers + template).
 *   - URL must be http/https (no file:, data:, etc.).
 *   - Template expansion is JSON-safe (values JSON-encoded when substituted
 *     into a JSON template; raw text for {{content}}/{{prompt}}).
 */
export async function POST(request) {
  try {
    // Finding #7 follow-up (2026-10-26): route-level requireAuth. POST
    // /api/hooks makes an outbound HTTP call using the captured message
    // body (prompts, provider responses, auth-bearing content). An
    // unauthenticated peer could exfiltrate stored conversation history
    // to an attacker-controlled URL.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { messageId, url, template, headers, timeoutMs } = body;

    if (!messageId || !url) {
      return NextResponse.json({ error: "messageId and url are required" }, { status: 400 });
    }

    // URL scheme whitelist — no file:, data:, etc.
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
    }

    const detail = await getRequestDetailById(messageId);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Build the substitution context from the message detail.
    const ctx = buildHookContext(detail, messageId);

    // Expand {{field}} placeholders. Values are JSON-encoded when the
    // template is JSON (starts with { or [), raw otherwise.
    const isJsonTemplate = /^\s*[\[{]/.test(template || "");
    const expand = (str) => expandTemplate(str, ctx);

    let payload;
    if (template) {
      payload = expand(template);
    } else {
      // Default payload: JSON envelope with the message fields.
      payload = JSON.stringify({
        id: messageId,
        model: detail.model,
        provider: detail.provider,
        sourceApp: detail.sourceApp,
        conversationId: detail.conversationId,
        status: detail.status,
        errorCategory: detail.errorCategory,
        timestamp: detail.timestamp,
        request: detail.request,
        response: detail.response,
      });
    }

    // Outbound headers — strip any Authorization the caller tried to smuggle.
    const outHeaders = { "Content-Type": "application/json" };
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === "authorization") continue; // never forward raw auth
        outHeaders[k] = String(v);
      }
    }

    const timeout = Math.min(Math.max(Number(timeoutMs) || 10000, 100), 60000);
    const res = await fetch(url, {
      method: "POST",
      headers: outHeaders,
      body: payload,
      signal: AbortSignal.timeout(timeout),
    });

    const resText = await res.text().catch(() => "");
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: resText.slice(0, 2000),
    });
  } catch (error) {
    console.error("[API] Hook delivery failed:", error);
    return NextResponse.json({ error: error.message || "Hook delivery failed" }, { status: 500 });
  }
}