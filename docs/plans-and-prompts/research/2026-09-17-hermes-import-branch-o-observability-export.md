# Branch O: Observability Export & Interop — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, observability, export, interop, binary-tree, branch-o

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch O: OBSERVABILITY EXPORT & INTEROP

Imported messages should be exportable to external observability platforms (Langfuse, Helicone, OpenTelemetry, Datadog, Grafana) and importable from them, so 9Router's unified log can feed the user's existing tooling.

### L2 O1: EXPORT TARGETS

#### L3 O1a: Langfuse Export
- **L4 O1a1: Langfuse SDK Integration**
  - L5: Use `langfuse` npm SDK to create traces/observations from imported messages
  - L6: Map `conversation_id` → Langfuse trace, each message → observation
- **L4 O1a2: Langfuse Batch Export**
  - L5: Batch export endpoint `POST /api/messages/export/langfuse`
  - L6: Configurable batch size (default 100), retry with backoff

#### L3 O1b: OpenTelemetry Export
- **L4 O1b1: OTLP Trace Export**
  - L5: Export imported messages as OTLP traces (gen_ai.* semantic conventions)
  - L6: Use `@opentelemetry/exporter-trace-otlp-http`
- **L4 O1b2: OTLP Metrics Export**
  - L5: Export counters (requests, errors, tokens) as OTLP metrics
  - L6: Use `@opentelemetry/sdk-metrics`

#### L3 O1c: Helicone Export
- **L4 O1c1: Helicone API Push**
  - L5: POST to Helicone's ingestion endpoint with request/response pairs
  - L6: Map model names, costs, latency

#### L3 O1d: Generic Webhook Export
- **L4 O1d1: JSON Webhook**
  - L5: POST imported messages to a user-configured webhook URL
  - L6: HMAC-signed payloads, retry queue

### L2 O2: IMPORT FROM OBSERVABILITY PLATFORMS

#### L3 O2a: Langfuse Import
- **L4 O2a1: Langfuse API Pull**
  - L5: Fetch traces from Langfuse API and convert to import format
  - L6: Incremental sync via `updatedAt` cursor

#### L3 O2b: OpenTelemetry Collector
- **L4 O2b1: OTLP Receiver**
  - L5: Run an OTLP receiver endpoint in 9Router to accept traces
  - L6: Convert gen_ai spans to imported_messages rows

### L2 O3: EXPORT FORMATS

#### L3 O3a: JSONL Export
- **L4 O3a1: Full Export**
  - L5: `GET /api/messages/export?format=jsonl` streams all imported messages
  - L6: One JSON object per line, NDJSON-compatible
- **L4 O3a2: Filtered Export**
  - L5: Same filters as GET /api/messages (provider, model, date range)
  - L6: Streams with cursor pagination

#### L3 O3b: CSV Export
- **L4 O3b1: Summary CSV**
  - L5: Flat columns: timestamp, provider, model, status, tokens, cost, error
  - L6: For spreadsheet analysis

#### L3 O3c: HAR Export
- **L4 O3c1: HAR Format**
  - L5: Export as HAR (HTTP Archive) for debugging tools
  - L6: Map request/response JSON to HAR entries

### L2 O4: SYNC SCHEDULING

#### L3 O4a: Manual Export
- **L4 O4a1: UI Button**
  - L5: "Export" button on Messages page with format picker
  - L6: Downloads file client-side

#### L3 O4b: Scheduled Export
- **L4 O4b1: Cron Export**
  - L5: Configurable schedule (daily/weekly) via settings
  - L6: Export to webhook or file path

### L2 O5: INTEROP STANDARDS

#### L3 O5a: OpenTelemetry GenAI Conventions
- **L4 O5a1: gen_ai.* Attributes**
  - L5: Follow `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens` conventions
  - L6: Ensures compatibility with OTel-native dashboards

#### L3 O5b: OpenRouter-Style Attribution
- **L4 O5b1: App Attribution Headers**
  - L5: Preserve `X-App` / source_app in exports
  - L6: Matches existing sourceApps.js conventions

## Open Questions

1. Should export be push (webhook) or pull (API) first?
2. Which platform is the user's primary observability backend?
3. Should OTLP receiver be a separate process or in-process?

## Related Implementation Plans

- `9router/impl-plan-import-09-observability-export.md` — Langfuse/OTel/webhook export with code