# PR #4821 — fix(vertex): honor API-key project/location for Gemini 4 Argon
- **Author:** rareba, **Merged:** last week (v0.5.104), **Files:** 3
- Raw Vertex API-key requests ignored providerSpecificData.projectId + location, always using projectless publisher endpoint. Gemini 4 Argon failed: Google resolved projectless endpoint to europe-west1 → 404 NOT_FOUND. Explicit project/global endpoint succeeded. Google docs Argon availability in global/us/eu.
- Fix: /v1/publishers/google/models/{model} → /v1/projects/{projectId}/locations/{location}/publishers/google/models/{model}. Honor configured location for explicitly-scoped API-key connections, default to global. Strip router effort suffixes (high) from model ID in URL. Preserve projectless routing when no project supplied.
- 8/8 unit tests pass (vertex-location.test.js).
- Relevance: **LOW** — vertex.js not in 53-file overlap.
