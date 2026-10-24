# Implementation Plan 09: Observability Export & Interop

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, observability, export, langfuse, opentelemetry

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-o-observability-export.md` (primary — Langfuse/OTel/webhook targets, push vs pull)
- `../2026-09-17-hermes-import-branch-l-security-privacy.md` (HMAC-signed webhook delivery)

## Goal

Export imported messages to external observability platforms (Langfuse, OpenTelemetry, webhooks) and import from them. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Settings repo | `src/lib/db/repos/settingsRepo.js` — `getSettings()`, `updateSettings(updates)`, `exportSettings()` exist |
| Messages API | `GET /api/messages` (src/app/api/messages/route.js) — returns `{ messages, conversations, errors, searchMode, pagination }`; filters: provider, model, status, errorCategory, sourceApp, conversationId, search, dates, facets |
| **Langfuse/OTel SDKs NOT installed** | `package.json` has no `langfuse` or `@opentelemetry/*` — must be added as optionalDependencies (lazy import) |
| Adapter API | `db.run/get/all/exec` positional params — no `.prepare()` |
| Imported messages repo | Plan 01: `getImportedMessages(filter)` returns `{ details, pagination }` |
| Export precedent | `exportSettings()` in settingsRepo — settings export exists; no message export endpoint yet |

## Scope

- Langfuse trace export
- OpenTelemetry OTLP export
- Generic webhook export
- JSONL/CSV export endpoints

## Design

### 1. Langfuse Exporter — `src/lib/import/exporters/langfuseExporter.js`

**Purpose:** Push imported messages as Langfuse traces. **Langfuse SDK is NOT installed** — lazy-import inside the function so the app doesn't break without it.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `getClient()` | Lazy-init Langfuse client from settings | client or null |
| `exportToLangfuse(messages)` | Create trace + generation observation per message | `{ exported, skipped, reason? }` |

```javascript
// src/lib/import/exporters/langfuseExporter.js
// SUGGESTION ONLY — review against actual codebase before implementing
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

### 2. OpenTelemetry Exporter — `src/lib/import/exporters/otelExporter.js`

**Purpose:** Push imported messages as OTLP spans. **OTel SDKs NOT installed** — lazy-import.

```javascript
// src/lib/import/exporters/otelExporter.js
// SUGGESTION ONLY — review against actual codebase before implementing
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

export async function exportToOtel(messages, endpoint = "http://localhost:4318/v1/traces") {
  const { trace, SpanStatusCode } = await getProvider(endpoint);
  const tracer = trace.getTracer("9router-import");
  let exported = 0;
  for (const msg of messages) {
    const span = tracer.startSpan(`llm.${msg.model || "unknown"}`, {
      attributes: {
        "gen_ai.system": msg.provider || "unknown",
        "gen_ai.request.model": msg.model || "unknown",
        "gen_ai.usage.input_tokens": msg.promptTokens || 0,
        "gen_ai.usage.output_tokens": msg.completionTokens || 0,
        "gen_ai.usage.total_tokens": msg.totalTokens || 0,
        "9router.source": msg.source,
        "9router.imported": true,
      },
    });
    if (msg.status === "error") {
      span.setStatus({ code: SpanStatusCode.ERROR, message: msg.errorMessage || "unknown error" });
    }
    span.end();
    exported++;
  }
  return { exported, skipped: 0 };
}
```

### 3. Generic Webhook Exporter — `src/lib/import/exporters/webhookExporter.js`

**Purpose:** POST batches to a user-configured webhook with HMAC signature.

```javascript
// src/lib/import/exporters/webhookExporter.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";

export async function exportToWebhook(messages, webhookUrl, secret) {
  const payload = {
    source: "9router-import",
    exportedAt: new Date().toISOString(),
    messages,
  };
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
    : null;
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "X-9Router-Signature": signature } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook export failed: ${res.status} ${res.statusText}`);
  return { exported: messages.length, skipped: 0 };
}
```

### 4. Export API Route — `src/app/api/messages/export/route.js`

**Purpose:** Export imported messages as JSONL/CSV or push to a target. Follows the `GET /api/messages` route pattern (`NextResponse`, `new URL(request.url).searchParams`).

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `GET(request)` | format=jsonl\|csv or target=langfuse\|otel\|webhook | `NextResponse` (file or JSON) |

```javascript
// src/app/api/messages/export/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { NextResponse } from "next/server";
import { getImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "jsonl"; // jsonl | csv
  const target = searchParams.get("target"); // langfuse | otel | webhook
  const filter = {
    provider: searchParams.get("provider"),
    model: searchParams.get("model"),
    status: searchParams.get("status"),
    source: searchParams.get("source"),
  };

  if (target) {
    const { exportToLangfuse } = await import("@/lib/import/exporters/langfuseExporter.js");
    const { exportToOtel } = await import("@/lib/import/exporters/otelExporter.js");
    const { exportToWebhook } = await import("@/lib/import/exporters/webhookExporter.js");
    const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
    const settings = await getSettings();

    const { details: messages } = await getImportedMessages({ ...filter, pageSize: 1000 });
    let result;
    if (target === "langfuse") result = await exportToLangfuse(messages);
    else if (target === "otel") result = await exportToOtel(messages, settings.otelEndpoint);
    else if (target === "webhook") result = await exportToWebhook(messages, settings.exportWebhookUrl, settings.exportWebhookSecret);
    return NextResponse.json(result);
  }

  const { details: messages } = await getImportedMessages({ ...filter, pageSize: 1000 });
  if (format === "csv") {
    const header = "timestamp,provider,model,status,latency_ms,prompt_tokens,completion_tokens,total_tokens,cost,error_category,source\n";
    const rows = messages.map((m) =>
      [m.importedAt, m.provider, m.model, m.status, m.latencyMs, m.promptTokens, m.completionTokens, m.totalTokens, m.cost, m.errorCategory, m.source]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    return new NextResponse(header + rows, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=messages.csv" },
    });
  }

  const jsonl = messages.map((m) => JSON.stringify(m)).join("\n");
  return new NextResponse(jsonl, {
    headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": "attachment; filename=messages.jsonl" },
  });
}
```

**⚠️ GROUNDING FIX:** Original used `getImportedMessages({ ...filter, pageSize: 1000 })` and destructured `{ messages }` — plan 01's repo returns `{ details, pagination }`, so destructure `{ details: messages }`.

## Steps (per-part instructions)

### Step 1 — Add `langfuse` + `@opentelemetry/*` as optionalDependencies
1. Add to `package.json` `optionalDependencies` (NOT `dependencies` — app must work without them).
2. **Verify:** `npm ls langfuse` shows it only if installed.

### Step 2 — Create exporters under `src/lib/import/exporters/`
1. Create `langfuseExporter.js`, `otelExporter.js`, `webhookExporter.js`.
2. **Verify:** each imports lazily; importing the module without SDKs installed doesn't crash.

### Step 3 — Add export settings to settings schema
1. Add `langfusePublicKey`, `langfuseSecretKey`, `langfuseBaseUrl`, `otelEndpoint`, `exportWebhookUrl`, `exportWebhookSecret` to settings defaults.
2. **Verify:** `getSettings()` returns the new fields with defaults.

### Step 4 — Create `/api/messages/export` route
1. Create `src/app/api/messages/export/route.js`.
2. **Verify:** `curl "http://localhost:20128/api/messages/export?format=jsonl"` → JSONL file.

### Step 5 — Add "Export" button to Messages page UI
1. Add a button that calls `/api/messages/export?format=jsonl`.
2. **Verify:** download works in browser.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| langfuse SDK | Heavy dependency | Lazy import, optionalDependencies |
| OTel SDK | Version churn | Pin versions |
| Webhook | Network failure | Retry queue |

## Verification (commands)

```bash
# JSONL export
curl "http://localhost:20128/api/messages/export?format=jsonl" -o messages.jsonl
# CSV export
curl "http://localhost:20128/api/messages/export?format=csv" -o messages.csv
# Round-trip: export → import → no duplicates (INSERT OR IGNORE by id)
curl -X POST http://localhost:20128/api/messages/import -H 'content-type: application/json' \
  --data-binary @messages.jsonl
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.