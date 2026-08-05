import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/db/repos/requestDetailsRepo.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getModelInfo } from "@/sse/services/model.js";
import { getProviderCredentials } from "@/sse/services/auth.js";
import { handleChatCore } from "open-sse/handlers/chatCore.js";

export const dynamic = "force-dynamic";

const MAX_CTX_CHARS = 4000; // truncate each context field to keep prompt cheap

function truncate(value) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (!s) return null;
  return s.length > MAX_CTX_CHARS ? `${s.slice(0, MAX_CTX_CHARS)}…[truncated]` : s;
}

/**
 * POST /api/analyze-error
 * Body: { detailId: string }
 *
 * Uses a configured model (settings.analyzeErrorModel, default oc/mimo-v2.5-free)
 * to analyze a captured request failure and return a diagnosis. Runs through the
 * same internal pipeline (credentials → chatCore) so any connected provider works.
 */
export async function POST(request) {
  try {
    const { detailId } = await request.json();
    if (!detailId) {
      return NextResponse.json({ error: "detailId is required" }, { status: 400 });
    }

    const detail = await getRequestDetailById(detailId);
    if (!detail) {
      return NextResponse.json({ error: "Request detail not found" }, { status: 404 });
    }

    const settings = await getSettings();
    const modelStr = settings.analyzeErrorModel || "oc/mimo-v2.5-free";

    // Build compact diagnostic context
    const context = {
      provider: detail.provider,
      model: detail.model,
      status: detail.status,
      error: detail.response?.error ?? detail.response?.status ?? null,
      request: truncate(detail.request) || null,
      providerResponse: truncate(detail.providerResponse) || null,
    };

    const modelInfo = await getModelInfo(modelStr);
    if (!modelInfo?.provider) {
      return NextResponse.json({ error: `Invalid analysis model: ${modelStr}` }, { status: 400 });
    }

    const credentials = await getProviderCredentials(modelInfo.provider);
    if (!credentials) {
      return NextResponse.json(
        { error: `No active credentials for analysis model provider "${modelInfo.provider}"` },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are 9Router's error analyst. Given a captured request failure, explain: " +
      "1) the likely root cause, 2) whether it looks transient (retryable) or permanent, " +
      "3) a concrete fix or workaround, 4) whether switching provider/model would avoid it. " +
      "Be concise — bullet points, no preamble.";

    const result = await handleChatCore({
      body: {
        model: modelStr,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this request failure:\n${JSON.stringify(context, null, 2)}` },
        ],
      },
      modelInfo,
      credentials,
      stream: false,
      connectionId: credentials.connectionId || "analyze-error",
      userAgent: "9router-analyze-error",
    });

    const resp = result?.response || result;
    if (!resp || typeof resp.json !== "function") {
      return NextResponse.json({ error: "Analysis request failed" }, { status: 502 });
    }
    const body = await resp.json().catch(() => ({}));
    const analysis =
      body?.choices?.[0]?.message?.content ||
      body?.content ||
      body?.output?.[0]?.content?.[0]?.text ||
      (body?.error?.message ? `Analysis failed: ${body.error.message}` : null);

    if (!analysis) {
      return NextResponse.json({ error: "Model returned no analysis" }, { status: 502 });
    }

    return NextResponse.json({ analysis, model: modelStr });
  } catch (error) {
    console.error("[analyze-error] Failed:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze error" }, { status: 500 });
  }
}
