# Prompts Used During Research & Implementation

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #prompts #research

## Research Prompts

### Prompt 1 — Existing fallback/combo UI audit
> Research the EXISTING combo/fallback UI and API in the 9router dashboard... What can users actually configure? Can they create a combo with ordered fallback models? Is there a test/playground feature?

**Result:** Combos page with 3 strategies, capacity adapter, no smart router, no per-model fallbacks, no test playground. Full catalog missing from pickers (connections only).

### Prompt 2 — Request pipeline trace for virtual provider
> Trace the COMPLETE flow for a request with model="9router/auto"... does chatCore detect source format from the body shape...? Will it double-translate?

**Result:** Confirmed double-translation flaw → ADR-001.

### Prompt 3 — SaveRequestDetail wiring validation
> Validate whether wiring saveRequestDetail() into chatCore.js is safe... 10 questions about signatures, exit points, latency, circular deps, test mocks.

**Result:** Already wired in 7/8 paths, buffered/batched, zero latency, no circular deps. Earlier "unwired" claim was wrong.

### Prompt 4 — ModelSelectModal + model catalog data flow
> Why does the modal only show connected providers...? Where does the full catalog live?

**Result:** `providerIdsToShow` = connections only; full catalog exists in `/api/models` (AI_MODELS) but never populates the picker → bug #6 (fixed in `99ac899f`).

### Prompt 5 — Dashboard settings API + combos page structure
> How do pages read/update settings? What's the combos page component structure? Reusable components?

**Result:** `PATCH /api/settings` (shallow merge — nested objects replaced whole), optimistic state pattern, Toggle/Select/Card/Input components available, no Slider (used native range).

## Build/Test Commands (reusable)

```bash
# Dev
npm run dev                              # port 20127 (Turbopack)
npm run dev:webpack                      # Webpack dev

# Production build + standalone
npx next build --webpack
node scripts/copy-standalone-assets.mjs

# Run built app
cd .next/standalone && PORT=20130 HOSTNAME=127.0.0.1 DATA_DIR=/tmp/9r-e2e2 JWT_SECRET=test-secret-123 INITIAL_PASSWORD=123456 NODE_ENV=production node server.js

# Tests
cd tests && npx vitest run                        # full suite
cd tests && npx vitest run unit/<file>.test.js     # single file

# Mock upstream (E2E)
node /tmp/mock-upstream.cjs                        # port 24000, /models, /stats, /reset, /fail429, /fail500
```

## E2E Test Recipe (production)

1. Build + copy assets
2. Start server on 20130 with clean DATA_DIR
3. Start mock upstream on 24000
4. Login (123456)
5. Create provider node (prefix `mockreal`) + connection
6. PATCH settings: enableObservability, smartRouter, markdownLogEnabled
7. Send requests: plain model, modelRouter (virtual), per-model fallback target, stream:true/false/omitted
8. Verify: response content, fallbackChain, conversationId + errorCategory in details, markdown file, drawer UI
