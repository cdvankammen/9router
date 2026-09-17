/**
 * OpenRouter usage — GET https://openrouter.ai/api/v1/key
 * Auth: Authorization: Bearer <apiKey>
 *
 * Response (per official docs, 2026):
 *   { data: { label, limit, limit_reset, limit_remaining,
 *             usage, usage_daily, usage_weekly, usage_monthly,
 *             is_free_tier, rate_limit } }
 * All money figures are USD credits:
 *   - limit:          credit limit for the key (null = unlimited)
 *   - limit_remaining: remaining credits (null = unlimited)
 *   - usage:          credits used (all time)
 *
 * Docs: https://openrouter.ai/docs/api-reference/limits
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { toFiniteNumber } from "./shared.js";

// Official documented endpoint (https://openrouter.ai/docs/api-reference/limits).
// NOTE: registry usage.url still carries the legacy /auth/key alias — both
// routes exist and behave identically; /api/v1/key is the documented one.
const USAGE_URL = "https://openrouter.ai/api/v1/key";

/**
 * Map OpenRouter credit figures to the UI's normalized quota shape.
 * `limit_remaining` is the authoritative "remaining" value per the API;
 * fall back to total − used only when it is absent.
 */
export function buildOpenRouterQuota(data = {}) {
  const limit = toFiniteNumber(data.limit, 0);
  const limitRemaining = toFiniteNumber(data.limit_remaining, null);
  const used = toFiniteNumber(data.usage, 0);

  // null / absent limit => unlimited key
  let unlimited;
  if (data.limit === null || data.limit === undefined || data.limit === "") {
    unlimited = true;
  } else {
    unlimited = !Number.isFinite(Number(data.limit));
  }

  let remaining;
  if (limitRemaining !== null) {
    remaining = limitRemaining;
  } else {
    remaining = Math.max(0, limit - used);
  }

  return {
    name: "credits",
    used,
    total: limit,
    remaining,
    remainingPercentage:
      limit > 0 ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : 100,
    resetAt: null,
    unlimited,
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
    const quota = buildOpenRouterQuota(data);

    // Only surface a quota row when the key actually carries a credit
    // figure to show (limit or usage present).
    if (quota.used <= 0 && quota.total <= 0 && quota.remaining <= 0) {
      return {
        plan,
        message: "OpenRouter connected. No quota data returned for this key.",
        quotas: {},
      };
    }

    return { plan, quotas: { [quota.name]: quota } };
  } catch (error) {
    return { message: `OpenRouter error: ${error.message}` };
  }
}