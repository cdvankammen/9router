# Implementation Plan 34 — Provider Registry & Model Metadata — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #provider-registry #model-metadata #onboarding #health-tracking #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/providers/registry/` files, `open-sse/config/providerModels.js`, `scripts/migrate-registry.mjs`, `scripts/injectDisplayToRegistry.mjs`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run registry scripts, check validation, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-34-provider-registry-models.md`, `../research/9router/34-serving-policy.md` (registry tie-in), `../research/9router/27-openai-multi-login.md` (multi-login tie-in)

## Scope

**In scope:** registry schema (name, base URL, auth, capabilities, models) + validation; model metadata (context window, pricing, capabilities, aliases) + update workflow + optional auto-discovery; guided onboarding flow (config → test → activate); provider health tracking + dashboard + alerts.
**Out of scope:** model training; provider account management.

## Milestones

### M1 — Registry schema + validation

**Reference code (`open-sse/providers/registry/schema.js`):**

```js
// Schema: validate provider registry entries.
export const PROVIDER_SCHEMA = {
  required: ["name", "baseUrl", "auth", "models"],
  properties: {
    name: { type: "string" },
    baseUrl: { type: "string", pattern: "^https?://" },
    auth: { type: "object", properties: { type: { type: "string", enum: ["api_key", "oauth", "none"] } } },
    models: { type: "array", items: { type: "object", properties: { id: { type: "string" } } } },
    capabilities: { type: "object" },
  },
};

export function validateProvider(provider) {
  const errors = [];
  if (!provider.name) errors.push("missing name");
  if (!provider.baseUrl) errors.push("missing baseUrl");
  if (!provider.auth) errors.push("missing auth");
  if (!provider.models?.length) errors.push("missing models");
  for (const m of provider.models ?? []) {
    if (!m.id) errors.push(`model missing id: ${JSON.stringify(m)}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
```

**Acceptance criteria:** schema defined; validation catches missing fields; used in migration scripts.

### M2 — Model metadata + update workflow

**Reference code (`open-sse/config/providerModels.js` extension):**

```js
// Model metadata: context window, pricing, capabilities, aliases.
export const MODEL_METADATA = {
  "gpt-4o": {
    contextWindow: 128_000,
    pricing: { input: 2.50 / 1e6, output: 10.00 / 1e6 },
    capabilities: ["text", "vision", "function_calling"],
    aliases: ["gpt-4o-2024-05-13", "gpt-4o-default"],
  },
  "claude-3.5-sonnet": {
    contextWindow: 200_000,
    pricing: { input: 3.00 / 1e6, output: 15.00 / 1e6 },
    capabilities: ["text", "vision", "function_calling"],
    aliases: ["claude-3-5-sonnet-20241022"],
  },
};

// Update workflow: versioned metadata; auto-discovery from provider APIs when available.
export function updateModelMetadata(modelId, updates) {
  const existing = MODEL_METADATA[modelId] ?? {};
  MODEL_METADATA[modelId] = { ...existing, ...updates, updatedAt: Date.now() };
}

// Alias resolution: given a user-sent model name, resolve to canonical.
export function resolveModelAlias(modelName) {
  for (const [canonical, meta] of Object.entries(MODEL_METADATA)) {
    if (meta.aliases?.includes(modelName)) return canonical;
  }
  return modelName;
}
```

**Acceptance criteria:** metadata per model; alias resolution; update workflow.

### M3 — Guided onboarding flow

**Reference code (`src/app/dashboard/providers/OnboardingWizard.jsx`):**

```jsx
// Steps: select provider → enter credentials → test connection → activate.
export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState(null);
  const [credentials, setCredentials] = useState({});

  const steps = [
    <ProviderSelect key="select" onSelect={(p) => { setProvider(p); setStep(1); }} />,
    <CredentialEntry key="creds" provider={provider} credentials={credentials} onChange={setCredentials} onNext={() => setStep(2)} />,
    <ConnectionTest key="test" provider={provider} credentials={credentials} onNext={() => setStep(3)} />,
    <ActivationSummary key="activate" provider={provider} onActivate={() => onComplete(provider, credentials)} />,
  ];

  return <div className="onboarding-wizard">{steps[step]}</div>;
}
```

**Acceptance criteria:** wizard flows: select → creds → test → activate; test validates connection.

### M4 — Health tracking + dashboard + tests

**Reference code (`src/lib/db/repos/providerHealthRepo.js`):**

```js
export async function recordProviderHealth(provider, { errorRate, latency, status, lastChecked }) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO provider_health (provider, error_rate, latency, status, last_checked, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      error_rate = excluded.error_rate, latency = excluded.latency,
      status = excluded.status, last_checked = excluded.last_checked, updated_at = excluded.updated_at
  `, [provider, errorRate, latency, status, lastChecked, Date.now()]);
}

export async function getProviderHealth(provider) {
  const db = await getAdapter();
  return db.get(`SELECT * FROM provider_health WHERE provider = ?`, [provider]);
}
```

**Files touched:** dashboard providers page (health indicators, onboarding), `tests/unit/provider-registry.test.js` (new).

**Acceptance criteria:** health tracked; dashboard shows health; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry staleness | Validation + regeneration scripts |
| Metadata accuracy | Provider API auto-discovery |
| Onboarding failure | Step-by-step error guidance |

## Verification

- Unit: validation, alias resolution, health
- Manual: onboarding wizard → test → activate
- Regression: `tests/__baseline__/verify-no-regression.mjs`