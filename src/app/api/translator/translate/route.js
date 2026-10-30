import { NextResponse } from "next/server";
import { detectFormat, getTargetFormat } from "open-sse/services/provider.js";
import { translateRequest } from "open-sse/translator/index.js";
import { FORMATS } from "open-sse/translator/formats.js";
import { getModelInfo } from "@/sse/services/model.js";
import { getProviderConnections } from "@/lib/localDb.js";
import { getExecutor } from "open-sse/executors/index.js";

// SECURITY (Finding #337): redact credential-bearing headers before they
// reach the authenticated dashboard client. The translator step-3 response
// returns the URL + headers the executor would use to hit the upstream
// provider — Authorization: Bearer sk-..., x-api-key: sk-ant-..., etc.
// An authenticated dashboard user could otherwise iterate every configured
// provider and dump every stored API key, OAuth access token, and copilot
// token. The /send route rebuilds credentials from the DB server-side, so
// it never depends on these headers — they are for human debugging only.
//
// Mirrors SENSITIVE_HEADER_PATTERNS in open-sse/utils/requestLogger.js —
// keep the two lists in sync.
const REDACT_HEADER_PATTERNS = [
  "authorization",
  "x-api-key",
  "x-goog-api-key",
  "anthropic-api-key",
  "cookie",
  "proxy-authorization",
  "token",
];
function redactSensitiveHeaders(headers) {
  if (!headers || typeof headers !== "object") return headers;
  const out = { ...headers };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (REDACT_HEADER_PATTERNS.some((p) => lower.includes(p))) {
      const v = out[key];
      if (typeof v === "string" && v.length > 10) {
        out[key] = `${v.slice(0, 6)}...${v.slice(-4)} (${v.length} chars, redacted)`;
      } else if (typeof v === "string") {
        out[key] = "[redacted]";
      }
    }
  }
  return out;
}

export async function POST(request) {
  try {
    const { step, body } = await request.json();

    if (!step || !body) {
      return NextResponse.json({ success: false, error: "Step and body required" }, { status: 400 });
    }

    switch (step) {
      case 1: {
        // Detect provider + formats from 1_req_client.json
        const clientBody = body.body || body;
        const { provider, model } = await getModelInfo(clientBody.model);
        const sourceFormat = detectFormat(clientBody);
        const targetFormat = getTargetFormat(provider);
        return NextResponse.json({ success: true, result: { provider, model, sourceFormat, targetFormat } });
      }

      case 2: {
        // source → OpenAI intermediate (mirrors 3_req_openai.json)
        // Translate source→openai only (half of the pipeline)
        const clientBody = body.body || body;
        const { provider, model } = await getModelInfo(clientBody.model);
        const sourceFormat = detectFormat(clientBody);
        const stream = clientBody.stream !== false;

        // translateRequest(source, OPENAI) = only the first half
        const result = translateRequest(sourceFormat, FORMATS.OPENAI, model, clientBody, stream, null, provider);
        delete result._toolNameMap;

        return NextResponse.json({ success: true, result: { body: result } });
      }

      case 3: {
        // OpenAI intermediate → target + build URL/headers (mirrors 4_req_target.json)
        const openaiBody = body.body || body;
        const provider = body.provider;
        const model = body.model;

        if (!provider || !model) {
          return NextResponse.json({ success: false, error: "provider and model required" }, { status: 400 });
        }

        const targetFormat = getTargetFormat(provider);
        const stream = openaiBody.stream !== false;

        // translateRequest(OPENAI, target) = second half of pipeline
        const translated = translateRequest(FORMATS.OPENAI, targetFormat, model, openaiBody, stream, null, provider);
        delete translated._toolNameMap;

        // Build URL + headers via executor (same as chatCore → executor.execute)
        const connections = await getProviderConnections({ provider });
        const connection = connections.find(c => c.isActive !== false);
        if (!connection) {
          return NextResponse.json({ success: false, error: `No active connection for provider: ${provider}` }, { status: 400 });
        }

        const credentials = {
          apiKey: connection.apiKey,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          copilotToken: connection.copilotToken,
          projectId: connection.projectId,
          providerSpecificData: connection.providerSpecificData
        };

        const executor = getExecutor(provider);
        const url = executor.buildUrl(model, stream, 0, credentials);
        const headers = executor.buildHeaders(credentials, stream);
        const finalBody = executor.transformRequest(model, translated, stream, credentials);

        // SECURITY (Finding #337): redact before returning to the dashboard
        // client. The full credentials stay server-side in `credentials` and
        // are used by executor.buildUrl/buildHeaders — only the response
        // JSON that crosses the wire is masked.
        return NextResponse.json({ success: true, result: { url, headers: redactSensitiveHeaders(headers), body: finalBody } });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid step (1-3)" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in translator:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
