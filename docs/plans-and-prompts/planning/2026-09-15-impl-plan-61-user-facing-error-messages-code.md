# Implementation Plan 61 — User-Facing Error Messages — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #error-messages #clarity #localization #actionable #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`open-sse/config/errorCodes.js` if present; error handling in `open-sse/handlers/chatCore.js`; `src/app/api/v1/*` routes; i18n setup in `src/i18n/`; plan 19 unified error system).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — trigger each error code; confirm message structure, guidance, and locale fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-61-user-facing-error-messages.md`, `../research/9router/impl-plan-19-error-system.md`, `../research/9router/impl-plan-30-i18n.md`.

## Scope

**In scope:** message framework (title, description, cause, action, reference); message registry per error code with generic fallback; actionable guidance (retry, check config, check quota, contact support) with dashboard/doc links; consistent JSON + UI format and tone; localization via message keys with English fallback; coverage check.
**Out of scope:** rewriting upstream provider error text (pass-through stays); voice/tone personalization.

## Milestones

### M1 — Message framework + registry

**Reference code (`open-sse/config/errorMessages.js`):**

```js
// Message registry: error code → structured message.
// Structure: { title, description, cause, action, reference }
export const ERROR_MESSAGES = {
  rate_limit_exceeded: {
    title: "Rate limit exceeded",
    description: "Too many requests in a short period.",
    cause: "The gateway limits requests per minute.",
    action: "Wait a moment and retry, or raise the limit in Settings → Rate limiting.",
    reference: "/dashboard/settings#rate-limiting",
  },
  invalid_api_key: {
    title: "Invalid API key",
    description: "The API key provided is not valid.",
    cause: "The key is missing, wrong, or revoked.",
    action: "Check your key in Settings → API keys, or generate a new one.",
    reference: "/dashboard/settings#api-keys",
  },
  context_length_exceeded: {
    title: "Context too long",
    description: "The request exceeds the model's context window.",
    cause: "The conversation is longer than the model supports.",
    action: "Shorten the conversation, or use a model with a larger context (plan 55).",
    reference: "/dashboard/models",
  },
  model_not_found: {
    title: "Model not found",
    description: "The requested model does not exist.",
    cause: "The model name is misspelled, unsupported, or sunset (plan 59).",
    action: "Check available models in the dashboard, or use an alias (plan 51).",
    reference: "/dashboard/models",
  },
  overloaded: {
    title: "Provider overloaded",
    description: "The upstream provider is temporarily overloaded.",
    cause: "The provider is experiencing high load.",
    action: "Retry shortly — fallback will try other providers automatically.",
    reference: null,
  },
  fallback_exhausted: {
    title: "All providers failed",
    description: "Every candidate provider failed for this request.",
    cause: "Multiple upstream errors occurred (see details).",
    action: "Check provider health in the dashboard, then retry.",
    reference: "/dashboard/health",
  },
};

export const GENERIC_MESSAGE = {
  title: "Something went wrong",
  description: "An unexpected error occurred.",
  cause: "Unknown.",
  action: "Retry, or check the logs for details.",
  reference: "/dashboard/logs",
};

export function messageFor(code) {
  return ERROR_MESSAGES[code] ?? GENERIC_MESSAGE;
}
```

**Acceptance criteria:** registry covers all error codes from plan 19; generic fallback exists.

### M2 — Message resolution + enrichment

**Reference code (`open-sse/handlers/messages.js`):**

```js
import { messageFor } from "../config/errorMessages.js";

// Enrich an OpenAI-shaped error with user-facing message fields.
export function enrichError(error) {
  const code = error.code ?? null;
  const msg = messageFor(code);
  return {
    ...error,
    user_message: {
      title: msg.title,
      description: msg.description,
      cause: msg.cause,
      action: msg.action,
      reference: msg.reference,
    },
  };
}

// Wire into error responses: { error: { message, type, param, code, user_message } }
export function toUserFacingError(err) {
  const base = err.error ?? err;
  return { error: { ...base, user_message: messageFor(base.code) } };
}
```

**Acceptance criteria:** every error response carries `user_message`; unknown codes get generic.

### M3 — Localization

**Reference code (`src/lib/i18n/errorMessages.js`):**

```js
// Message keys → per-locale strings. English is the fallback.
import { ERROR_MESSAGES, GENERIC_MESSAGE } from "../../../open-sse/config/errorMessages.js";

// Keyed messages: { code: { titleKey, descriptionKey, causeKey, actionKey } }
export const MESSAGE_KEYS = Object.fromEntries(
  Object.entries(ERROR_MESSAGES).map(([code, m]) => [
    code,
    { titleKey: `error.${code}.title`, descriptionKey: `error.${code}.description`, causeKey: `error.${code}.cause`, actionKey: `error.${code}.action` },
  ])
);

// Resolve with locale: fall back to English when a key is missing.
export function localizeMessage(code, locale, t) {
  const msg = ERROR_MESSAGES[code] ?? GENERIC_MESSAGE;
  const keys = MESSAGE_KEYS[code];
  if (!keys || !t) return msg; // no i18n configured — English
  return {
    title: t(keys.titleKey) ?? msg.title,
    description: t(keys.descriptionKey) ?? msg.description,
    cause: t(keys.causeKey) ?? msg.cause,
    action: t(keys.actionKey) ?? msg.action,
    reference: msg.reference,
  };
}
```

**Acceptance criteria:** locale resolution works; missing keys fall back to English; i18n files keyed consistently.

### M4 — Coverage check + tests

**Reference code (`scripts/check-error-messages.mjs`):**

```js
// Coverage check: every error code in errorCodes.js must have a message.
import { ERROR_MESSAGES } from "../open-sse/config/errorMessages.js";
import { ERROR_CODES } from "../open-sse/config/errorCodes.js";

const missing = ERROR_CODES.filter((c) => !ERROR_MESSAGES[c]);
if (missing.length) {
  console.error(`Missing error messages: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Error message coverage ok (${ERROR_CODES.length} codes)`);
```

**Files touched:** `open-sse/config/errorMessages.js` (new), `open-sse/handlers/messages.js` (new), `src/lib/i18n/errorMessages.js` (new), `open-sse/handlers/chatCore.js` (resolution integration), `scripts/check-error-messages.mjs` (new), `tests/unit/error-messages.test.js` (new).

**Acceptance criteria:** coverage check passes; tests verify structure + fallback + locale.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Message drift | Stale text | Registry-driven + coverage check |
| Translation gaps | Missing locales | English fallback |
| Jargon | Unclear text | Plain-language review |
| Coverage gaps | Generic messages | Coverage check in CI |

## Verification

- Unit: registry, enrich, localize, coverage
- Manual: trigger each error type → clear message + action
- Regression: `tests/__baseline__/verify-no-regression.mjs`