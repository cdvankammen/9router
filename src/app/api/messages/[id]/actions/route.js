import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { addAnnotation, deleteAnnotation } from "@/lib/usageDb";
import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import { extractText } from "@/shared/hookTemplate";
import { requireAuth } from "@/lib/auth/requireAuth";

let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

/**
 * POST /api/messages/:id/actions
 * Run a per-message action.
 *
 * Body: { action: string, ...params }
 *
 * Actions:
 *   - "replay"          Re-send the captured request to the same provider/model.
 *                       Body: { model?: string, provider?: string } (override)
 *   - "summarize"       Summarize the message via a model call.
 *                       Body: { model?: string } (default: settings.analyzeErrorModel)
 *   - "send-to-webhook" Send the message to a webhook URL (delegates to /api/hooks).
 *                       Body: { url, template?, headers?, timeoutMs? }
 *   - "add-note"        Add a note annotation. Body: { value, conversationId? }
 *   - "tag"             Add a tag annotation. Body: { value, conversationId? }
 *   - "remove-tag"      Remove a tag annotation. Body: { value }
 *   - "alert-on-match"  Send a webhook only if the message matches a condition.
 *                       Body: { url, match: { field, op, value }, template?, headers? }
 *                       field: "status"|"errorCategory"|"model"|"provider"|"sourceApp"
 *                       op: "eq"|"ne"|"contains"
 *
 * Security:
 *   - Never sends raw Authorization (hooks route strips it).
 *   - Replay uses the captured request body (already sanitized at capture).
 *   - Summarize uses the configured analyze model (never user-supplied URL).
 */
export async function POST(request, { params }) {
  try {
    // Finding #7 follow-up (2026-10-26): route-level requireAuth as defence-
    // in-depth. The middleware classifies /api/messages as ALWAYS_PROTECTED
    // (JWT required regardless of requireLogin), but the replay and
    // send-to-webhook actions ride stored credentials and make outbound
    // calls — an extra auth check here catches any future middleware
    // regression before those potent actions fire.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;
    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (action) {
      case "replay":
        return await replay(detail, body);
      case "summarize":
        return await summarize(detail, body);
      case "send-to-webhook":
        return await sendToWebhook(id, detail, body);
      case "add-note":
        return await addNote(id, detail, body);
      case "tag":
        return await addTag(id, detail, body);
      case "remove-tag":
        return await removeTag(id, detail, body);
      case "alert-on-match":
        return await alertOnMatch(id, detail, body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Action failed:", error);
    return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
  }
}

// ── action implementations ─────────────────────────────────────────────────

async function replay(detail, body) {
  await ensureInitialized();
  const requestBody = detail.request || {};
  // Override model/provider if requested
  if (body.model) requestBody.model = body.model;
  if (body.provider) requestBody.provider = body.provider;

  const req = new Request("http://localhost/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const res = await handleChat(req);
  const text = await res.text();
  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    response: text.slice(0, 4000),
  });
}

async function summarize(detail, body) {
  await ensureInitialized();
  const { getSettings } = await import("@/lib/usageDb");
  const settings = await getSettings();
  const model = body.model || settings.analyzeErrorModel || "oc/mimo-v2.5-free";

  const content = extractText(detail.response?.content || "");
  const prompt = extractText(detail.request?.messages || []);
  const truncated = detail.response?._truncated ? " (truncated)" : "";

  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You summarize captured AI gateway messages concisely. " +
          "Output: 2-4 bullet points covering what was asked, what happened, " +
          "and any errors or notable details.",
      },
      {
        role: "user",
        content: `Provider: ${detail.provider}\nModel: ${detail.model}\nStatus: ${detail.status}\nError: ${detail.errorCategory || "none"}\n\nPrompt:\n${prompt.slice(0, 4000)}\n\nResponse${truncated}:\n${content.slice(0, 4000)}`,
      },
    ],
    stream: false,
  };

  const req = new Request("http://localhost/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const res = await handleChat(req);
  const text = await res.text();
  let summary = text;
  try {
    const parsed = JSON.parse(text);
    summary = parsed?.choices?.[0]?.message?.content || text;
  } catch { /* keep raw */ }
  return NextResponse.json({ ok: res.ok, status: res.status, summary });
}

async function sendToWebhook(messageId, detail, body) {
  const { url, template, headers, timeoutMs } = body;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  // Delegate to the hooks route logic (shared implementation).
  const hooksRes = await fetch(new URL("/api/hooks", requestBaseUrl()).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messageId,
      url,
      template,
      headers,
      timeoutMs,
    }),
  });
  const json = await hooksRes.json().catch(() => ({}));
  return NextResponse.json(json, { status: hooksRes.status });
}

async function addNote(requestId, detail, body) {
  // UI sends { note }; API also accepts { value }.
  const value = body.note ?? body.value;
  const { conversationId } = body;
  if (!value) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }
  const annotation = await addAnnotation({
    requestId,
    conversationId: conversationId || detail.conversationId || null,
    kind: "note",
    value,
  });
  return NextResponse.json({ annotation }, { status: 201 });
}

async function addTag(requestId, detail, body) {
  // UI sends { tag }; API also accepts { value }.
  const value = body.tag ?? body.value;
  const { conversationId } = body;
  if (!value) {
    return NextResponse.json({ error: "tag is required" }, { status: 400 });
  }
  const annotation = await addAnnotation({
    requestId,
    conversationId: conversationId || detail.conversationId || null,
    kind: "tag",
    value,
  });
  return NextResponse.json({ annotation }, { status: 201 });
}

async function removeTag(requestId, detail, body) {
  const { value } = body;
  if (!value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }
  const deleted = await deleteAnnotation({ requestId, kind: "tag", value });
  return NextResponse.json({ deleted });
}

async function alertOnMatch(messageId, detail, body) {
  const { url, match, template, headers } = body;
  if (!url || !match) {
    return NextResponse.json({ error: "url and match are required" }, { status: 400 });
  }
  const { field, op, value } = match;
  if (!field || !op || value === undefined) {
    return NextResponse.json({ error: "match.field, match.op, match.value are required" }, { status: 400 });
  }

  const actual = String(detail[field] ?? "");
  let matched = false;
  switch (op) {
    case "eq": matched = actual === String(value); break;
    case "ne": matched = actual !== String(value); break;
    case "contains": matched = actual.includes(String(value)); break;
    default:
      return NextResponse.json({ error: `Unknown match op: ${op}` }, { status: 400 });
  }

  if (!matched) {
    return NextResponse.json({ ok: true, matched: false, skipped: true });
  }

  const hooksRes = await fetch(new URL("/api/hooks", requestBaseUrl()).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, url, template, headers }),
  });
  const json = await hooksRes.json().catch(() => ({}));
  return NextResponse.json({ ...json, matched: true });
}

// ── helpers ────────────────────────────────────────────────────────────────

function requestBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:20128";
}