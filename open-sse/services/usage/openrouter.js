/**
 * OpenRouter usage — GET https://openrouter.ai/api/v1/auth/key
 * Auth: Authorization: Bearer <apiKey>
 *
 * Response (2026):
 *   { data: { label, usage, limit, is_free_tier, rate_limit, credits } }
 *   - usage:  tokens used (null when key predates limits tracking)
 *   - limit:  token limit (null = unlimited key)
 *   - credits: { total, used, remaining } in USD (null when not on credits)
 *
 * Docs: https://openrouter.ai/docs/api-reference/auth-key
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { U, toFiniteNumber } from "./shared.js";

const USAGE_URL = U("openrouter").url;

function buildCreditsQuota(credits) {
  if (!credits || typeof credits !== "object") return null;
  const total = toFiniteNumber(credits.total, 0);
  const used = toFiniteNumber(credits.used, 0);
  const remaining = toFiniteNumber(
    credits.remaining,
    Math.max(0, total - used),
  );
  return {
    used,
    total,
    remainingPercentage:
      total > 0
        ? Math.max(0, Math.min(100, (remaining / total) * 100))
        : 0,
    resetAt: null,
    unlimited: false,
  };
}

function buildTokenQuota(data) {
  const used = toFiniteNumber(data.usage, -1);
  if (used < 0) return null; // usage absent (null/undefined)
  // limit null/undefined = unlimited key; still surface usage context.
  const total = toFiniteNumber(data.limit, 0);
  return {
    used,
    total,
    remainingPercentage:
      total > 0
        ? Math.max(0, Math.min(100, ((total - used) / total) * 100))
        : 100,
    resetAt: null,
    unlimited: total <= 0,
  };
}

/**
 * @param {string|null|undefined} apiKey
 * @param {object|null} proxyOptions
 */
export async function getOpenRouterUsage(apiKey = null, proxyOptions = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return {
      message: "OpenRouter API key not available. Add a key to view usage.",
    };
  }

  try {
    const response = await proxyAwareFetch(
      USAGE_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );

    if (response.status === 401 || response.status === 403) {
      return {
        plan: "OpenRouter",
        message: "OpenRouter authentication failed. Check the API key.",
      };
    }

    if (response.status === 429) {
      return {
        plan: "OpenRouter",
        message:
          "OpenRouter rate limited the usage request (429). Try again shortly.",
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        plan: "OpenRouter",
        message: `OpenRouter usage API error (${response.status})${
          errText ? `: ${errText.slice(0, 120)}` : ""
        }`,
      };
    }

    const json = await response.json().catch(() => null);
    const data = json?.data ?? json;
    if (!data || typeof data !== "object") {
      return { message: "OpenRouter usage response was not JSON." };
    }

    const plan =
      data.is_free_tier === true ? "OpenRouter (Free Tier)" : "OpenRouter";
    const quotas = {};
    const creditsQuota = buildCreditsQuota(data.credits);
    if (creditsQuota) quotas["Credits (USD)"] = creditsQuota;
    const tokenQuota = buildTokenQuota(data);
    if (tokenQuota) quotas["Tokens (monthly)"] = tokenQuota;

    if (Object.keys(quotas).length === 0) {
      return {
        plan,
        message:
          "OpenRouter connected. No quota data returned for this key.",
        quotas: {},
      };
    }

    return { plan, quotas };
  } catch (error) {
    return { message: `OpenRouter error: ${error.message}` };
  }
}