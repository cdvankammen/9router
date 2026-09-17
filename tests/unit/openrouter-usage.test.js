import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import { buildOpenRouterQuota } from "../../open-sse/services/usage/openrouter.js";
import {
  USAGE_SUPPORTED_PROVIDERS,
  USAGE_APIKEY_PROVIDERS,
} from "../../src/shared/constants/providers.js";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const USAGE_URL = "https://openrouter.ai/api/v1/key";
const TEST_KEY = "sk-or-test";

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("openrouter registry usage flags", () => {
  it("is listed for apikey quota dashboard", () => {
    expect(USAGE_SUPPORTED_PROVIDERS).toContain("openrouter");
    expect(USAGE_APIKEY_PROVIDERS).toContain("openrouter");
  });
});

describe("buildOpenRouterQuota", () => {
  it("prefers limit_remaining over computed total - used", () => {
    const q = buildOpenRouterQuota({
      usage: 3,
      limit: 10,
      limit_remaining: 5,
    });
    expect(q).toMatchObject({
      name: "credits",
      used: 3,
      total: 10,
      remaining: 5,
      unlimited: false,
    });
    expect(q.remainingPercentage).toBe(50);
  });

  it("falls back to total - used when limit_remaining is absent", () => {
    const q = buildOpenRouterQuota({ usage: 2, limit: 10 });
    expect(q.remaining).toBe(8);
    expect(q.remainingPercentage).toBe(80);
  });

  it("flags unlimited when limit is null", () => {
    const q = buildOpenRouterQuota({ usage: 500, limit: null });
    expect(q).toMatchObject({ used: 500, total: 0, unlimited: true });
    expect(q.remainingPercentage).toBe(100);
  });
});

describe("getUsageForProvider(openrouter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETs the key endpoint with Bearer apiKey", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "My Key",
          usage: 2,
          limit: 10,
          limit_remaining: 8,
          is_free_tier: false,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });

    expect(usage.message).toBeUndefined();
    expect(usage.plan).toBe("OpenRouter");
    expect(proxyAwareFetch).toHaveBeenCalledTimes(1);
    const [url, opts, proxyOptions] = proxyAwareFetch.mock.calls[0];
    expect(url).toBe(USAGE_URL);
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe("Bearer " + TEST_KEY);
    expect(proxyOptions).toBeNull();
  });

  it("maps paid-tier credits to a single credits quota", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "My Key",
          usage: 2,
          limit: 10,
          limit_remaining: 8,
          is_free_tier: false,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });

    expect(Object.keys(usage.quotas)).toEqual(["credits"]);
    expect(usage.quotas.credits).toMatchObject({
      used: 2,
      total: 10,
      remaining: 8,
      remainingPercentage: 80,
      unlimited: false,
      resetAt: null,
    });
  });

  it("handles free tier (is_free_tier true, no credit data)", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "Free Key",
          usage: 0,
          limit: null,
          limit_remaining: null,
          is_free_tier: true,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });

    expect(usage.plan).toBe("OpenRouter (Free Tier)");
    expect(usage.quotas).toEqual({});
    expect(usage.message).toMatch(/no quota data/i);
  });

  it("handles unlimited key (limit null) with usage present", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "Unlimited Key",
          usage: 500,
          limit: null,
          limit_remaining: null,
          is_free_tier: false,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });

    expect(usage.quotas.credits).toMatchObject({
      used: 500,
      total: 0,
      unlimited: true,
      remainingPercentage: 100,
    });
  });

  it("returns message on missing key / 401", async () => {
    const missing = await getUsageForProvider({ provider: "openrouter" });
    expect(missing.message).toMatch(/api key/i);
    expect(proxyAwareFetch).not.toHaveBeenCalled();

    proxyAwareFetch.mockResolvedValueOnce(
      response({ error: "invalid_api_key" }, { status: 401 }),
    );
    const auth = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });
    expect(auth.message).toMatch(/auth|key/i);
  });

  it("returns soft message (not an error) on 429", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({ error: "rate_limited" }, { status: 429 }),
    );
    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: TEST_KEY,
    });
    expect(usage.error).toBeUndefined();
    expect(usage.message).toMatch(/429/i);
  });
});

describe("parseQuotaData(openrouter)", () => {
  it("forwards the credits row for the dashboard table", () => {
    const rows = parseQuotaData("openrouter", {
      plan: "OpenRouter",
      quotas: {
        credits: {
          used: 2,
          total: 10,
          remaining: 8,
          remainingPercentage: 80,
          unlimited: false,
        },
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "credits",
      used: 2,
      total: 10,
      remainingPercentage: 80,
      unlimited: false,
    });
  });
});
