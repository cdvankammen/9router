# Implementation Plan Import-09 — Observability Export & Interop — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #observability #export #langfuse #opentelemetry #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (settings repo from `src/lib/db/repos/settingsRepo.js` — `getSettings()`, `updateSettings(updates)`, `exportSettings()`; messages API from `src/app/api/messages/route.js`; **Langfuse/OTel SDKs NOT installed** — must be added as optionalDependencies with lazy import; imported messages repo from plan import-01).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — exporters; endpoints; settings.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-09-observability-export.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** Langfuse trace export; OpenTelemetry OTLP export; generic webhook export; JSONL/CSV export endpoints.
**Out of scope:** import API (import-03); analytics insights (import-16).

## Milestones

### M1 — Langfuse exporter

**Reference code (`src/lib/import/exporters/langfuseExporter.js`):**

```js
// Langfuse SDK is NOT installed — lazy-import inside the function so the app doesn't break without it.
let client = null;
async function getClient() {
  if (client) return client;
  const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
  const settings = await getSettings();
  if (!settings.langfusePublicKey || !settings.langfuseSecretKey) return null;
  const { Langfuse } = await import("langfuse"); // optionalDependency — lazy
  client = new Langfuse({
    publicKey: settings.langfusePublicKey,
    secretKey: settings.langfuseSecretKey,
    baseUrl: settings.langfuseBaseUrl || "https://cloud.langfuse.com",
  });
  return client;
}

export async function exportToLangfuse(messages) {
  const lf = await getClient();
  if (!lf) return { exported: 0, skipped: messages.length, reason: "langfuse-not-configured" };

  let exported = 0;
  for (const msg of messages) {
    const trace = lf.trace({
      id: msg.conversationId || msg.id,
      name: `import-${msg.source}`,
      timestamp: new Date(msg.importedAt || Date.now()),
      metadata: { source: msg.source, sourceSessionId: msg.sourceSessionId },
    });
    trace.observation({
      id: msg.id,
      type: "GENERATION",
      name: msg.model || "unknown-model",
      model: msg.model,
      input: msg.requestJson ? JSON.parse(msg.requestJson) : undefined,
      output: msg.responseJson ? JSON.parse(msg.responseJson) : undefined,
      startTime: new Date(msg.importedAt || Date.now()),
      endTime: new Date((msg.importedAt || Date.now()) + (msg.latencyMs || 0)),
      usage: {
        input: msg.promptTokens || 0,
        output: msg.completionTokens || 0,
        total: msg.totalTokens || 0,
      },
      metadata: { status: msg.status, errorCategory: msg.errorCategory },
    });
    exported++;
  }
  await lf.flushAsync();
  return { exported, skipped: 0 };
}
```

**Acceptance criteria:** lazy client; trace + observation; flush.

### M2 — OpenTelemetry exporter

**Reference code (`src/lib/import/exporters/otelExporter.js`):**

```js
// OTel SDKs NOT installed — lazy-import.
let provider = null;
async function getProvider(endpoint) {
  if (provider) return provider;
  const [{ trace, SpanStatusCode }, { OTLPTraceExporter }, { NodeTracerProvider, SimpleSpanProcessor }] = await Promise.all([
    import("@opentelemetry/api"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/sdk-trace-node"),
  ]);
  provider = new NodeTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter({ url: endpoint })));
  provider.register();
  return { trace, SpanStatusCode };
}

export async function exportToOtel(messages, { endpoint = "http://localhost:4318/v1/traces" } = {}) {
  const { trace, SpanStatusCode } = await getProvider(endpoint);
  const tracer = trace.getTracer("9router-import");
  for (const msg of messages) {
    const span = tracer.startSpan(`import-${msg.source}`, {
      attributes: { "9r.model": msg.model, "9r.provider": msg.provider, "9r.status": msg.status },
    });
    if (msg.errorCategory) span.setStatus({ code: SpanStatusCode.ERROR, message: msg.errorCategory });
    span.end();
  }
  return { exported: messages.length, skipped: 0 };
}
```

**Acceptance criteria:** lazy provider; spans; status.

### M3 — Webhook + JSONL/CSV export

**Reference code (`src/lib/import/exporters/webhookExporter.js` + `src/app/api/messages/export/route.js`):**

```js
// Webhook exporter.
export async function exportToWebhook(messages, { url, headers = {} } = {}) {
  if (!url) return { exported: 0, skipped: messages.length, reason: "no-webhook-url" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ messages }),
  });
  return { exported: res.ok ? messages.length : 0, skipped: res.ok ? 0 : messages.length, status: res.status };
}

// Export endpoint: JSONL/CSV.
import { NextResponse } from "next/server";
import { getImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "jsonl";
  const { items } = await getImportedMessages({ limit: 1000 });
  if (format === "csv") {
    const header = "id,imported_at,source,provider,model,status,latency_ms,cost";
    const rows = items.map((m) => [m.id, m.imported_at, m.source, m.provider, m.model, m.status, m.latency_ms, m.cost].join(","));
    return new NextResponse([header, ...rows].join("\n"), { headers: { "content-type": "text/csv" } });
  }
  return NextResponse.json({ items });
}
```

**Acceptance criteria:** webhook; JSONL; CSV.

### M4 — Settings + tests

**Reference code (`src/lib/db/repos/settingsRepo.js` addition):**

```js
// DEFAULT_SETTINGS additions.
export const DEFAULT_SETTINGS = {
  // ...existing keys...
  langfusePublicKey: "",
  langfuseSecretKey: "",
  langfuseBaseUrl: "https://cloud.langfuse.com",
  otelEndpoint: "",
  webhookUrl: "",
};
```

**Files touched:** `src/lib/import/exporters/langfuseExporter.js` (new), `src/lib/import/exporters/otelExporter.js` (new), `src/lib/import/exporters/webhookExporter.js` (new), `src/app/api/messages/export/route.js` (new), `src/lib/db/repos/settingsRepo.js` (settings), `package.json` (optionalDependencies: langfuse, @opentelemetry/*), `tests/unit/import-export.test.js` (new).

**Acceptance criteria:** settings; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| SDKs not installed | Import errors | Lazy import |
| Settings missing | No export | DEFAULT_SETTINGS |
| Export volume | Slow exports | Batch limits |
| Webhook failures | Lost exports | Retry + status |

## Verification

- Unit: exportToLangfuse, exportToOtel, exportToWebhook, GET export endpoint
- Manual: configure settings → export → verify platform
- Regression: `tests/__baseline__/verify-no-regression.mjs`