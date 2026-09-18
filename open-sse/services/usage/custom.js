/**
 * Custom usage fetcher — generic quota endpoint for custom OpenAI-compatible
 * (and other custom) provider nodes that declare a user-facing usage URL.
 *
 * The node form exposes two optional fields:
 *   - usageUrl:       absolute http(s) URL that returns quota JSON
 *   - usageAuthMode:  "bearer" (default) | "header" | "none"
 *
 * Auth mapping (against the connection's apiKey / accessToken):
 *   - bearer: Authorization: Bearer <token>
 *   - header: x-api-key: <token>
 *   - none:   no auth header
 *
 * The endpoint may return the quota in several shapes, all normalized to the
 * UI's {name, used, total, remaining, remainingPercentage, resetAt, unlimited}:
 *   - { data: { ... } }                  (OpenAI-style envelope)
 *   - { usage: { ... } }                 (OpenAI usage-envelope)
 *   - { used, limit }                    (flat)
 *   - { remaining, limit }               (flat, remaining preferred over used)
 *   - { total, used } / { total, remaining }
 *   - { quota: { used, limit } }         (some gateways)
 *   - { credits: { used, total } } / { balance: { used, total } }
 * `total`/`limit` may be null → unlimited quota row.
 */
import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { toFiniteNumber, parseResetTime } from "./shared.js";

export const USAGE_AUTH_MODES = ["bearer", "header", "none"];

const USAGE_KEYS = new Set([
  "used", "limit", "remaining", "total", "resetat", "reset_at",
  "reset", "expiresat", "expires_at", "unlimited", "remainingpercentage",
  "remaining_percentage", "name", "label", "model", "modelkey", "model_key",
]);

const NUMERIC_KEYS = new Set([
  "used", "limit", "remaining", "total",
]);

function pickNestedQuotaObject(body) {
  if (!body || typeof body !== "object") return null;

  // Flat payload {used, limit, ...} is a quota object itself.
  if (Object.keys(body).some((k) => NUMERIC_KEYS.has(normalizeKeyName(k)))) {
    return body;
  }

  for (const key of ["data", "usage", "quota", "quotas", "credits", "balance", "result", "limits"]) {
    const value = body[key];
    if (value && typeof value === "object") {
      // Recurse one level for OpenAI-style envelope {data: {usage: {...}}}
      if (key === "data" || key === "result") {
        const inner = pickNestedQuotaObject(value);
        if (inner) return inner;
      }
      if (Object.keys(value).some((k) => NUMERIC_KEYS.has(String(k).toLowerCase()))) {
        return value;
      }
      // {quotas: {usage: {...}}} — take the first numeric-bearing child
      if (key === "quotas" && !Array.isArray(value)) {
        const child = Object.values(value).find(
          (v) => v && typeof v === "object" && Object.keys(v).some((k) => NUMERIC_KEYS.has(String(k).toLowerCase()))
        );
        if (child) return child;
      }
    }
  }
  return null;
}

function normalizeKeyName(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Normalize a raw quota payload into the UI quota row shape.
 * @param {object} raw - parsed JSON body
 * @returns {{name, used, total, remaining, remainingPercentage, resetAt, unlimited}|null}
 */
export function buildCustomQuota(raw) {
  if (!raw || typeof raw !== "object") return null;

  const quota = pickNestedQuotaObject(raw);
  if (!quota) return null;

  const values = {};
  for (const [key, value] of Object.entries(quota)) {
    const normalized = normalizeKeyName(key);
    if (USAGE_KEYS.has(normalized) && value !== undefined && value !== null) {
      values[normalized] = value;
    }
  }

  const used = toFiniteNumber(values.used, 0);
  const rawTotal = values.total !== undefined ? values.total : values.limit;
  const total = toFiniteNumber(rawTotal, 0);
  const remaining = toFiniteNumber(
    values.remaining !== undefined
      ? values.remaining
      : rawTotal !== undefined && values.used !== undefined
        ? Math.max(0, total - used)
        : undefined,
    0
  );

  let unlimited = values.unlimited === true;
  if (!unlimited) {
    const limitIsNull = quota.limit === null || quota.limit === undefined || quota.limit === "";
    const totalIsNull = quota.total === null || quota.total === undefined || quota.total === "";
    if (limitIsNull && totalIsNull) {
      unlimited = true;
    }
  }

  const resetAt = parseResetTime(values.resetat ?? values.reset_at ?? values.reset ?? values.expiresat ?? values.expires_at);

  return {
    name: String(values.name || values.label || values.model || "usage").trim() || "usage",
    used,
    total,
    remaining,
    remainingPercentage:
      total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 100,
    resetAt,
    unlimited,
  };
}

/**
 * @param {object} ctx - { provider, apiKey, accessToken, providerSpecificData, proxyOptions }
 * @returns {Promise<object>} normalized usage payload (message-style on error)
 */
export async function getCustomUsage(ctx = {}) {
  const {
    provider = "unknown",
    apiKey = null,
    accessToken = null,
    providerSpecificData = null,
    proxyOptions = null,
  } = ctx;

  const usageUrl = providerSpecificData?.usageUrl;
  if (!usageUrl || typeof usageUrl !== "string" || !usageUrl.trim()) {
    return { message: "Usage URL not configured for this connection." };
  }

  const token = apiKey || accessToken;
  const authMode = USAGE_AUTH_MODES.includes(providerSpecificData?.usageAuthMode)
    ? providerSpecificData.usageAuthMode
    : "bearer";

  const headers = { Accept: "application/json" };
  if (authMode === "bearer" && token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (authMode === "header" && token) {
    headers["x-api-key"] = token;
  }

  try {
    const response = await proxyAwareFetch(
      usageUrl.trim(),
      { method: "GET", headers },
      proxyOptions
    );

    if (response.status === 401 || response.status === 403) {
      return { message: "Usage API authentication failed. Check the API key." };
    }

    if (response.status === 429) {
      return { message: "Usage API rate limited the request (429). Try again shortly." };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        message: `Usage API error (${response.status})${errText ? `: ${errText.slice(0, 120)}` : ""}`,
      };
    }

    const json = await response.json().catch(() => null);
    const quota = buildCustomQuota(json);
    if (!quota) {
      return { message: "Usage API response did not contain quota data (used/limit)." };
    }

    return { plan: provider, quotas: { [quota.name]: quota } };
  } catch (error) {
    return { message: `Usage API error: ${error.message}` };
  }
}