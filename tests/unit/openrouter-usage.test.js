import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import {
  USAGE_SUPPORTED_PROVIDERS,
  USAGE_APIKEY_PROVIDERS,
} from "../../src/shared/constants/providers.js";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const USAGE_URL = "https://openrouter.ai/api/v1/auth/key";

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

describe("getUsageForProvider(openrouter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETs the auth/key endpoint with Bearer apiKey", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "My Key",
          usage: 1000,
          limit: 5000,
          is_free_tier: false,
          credits: { total: 10, used: 2, remaining: 8 },
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test",
    });

    expect(usage.message).toBeUndefined();
    expect(usage.plan).toBe("OpenRouter");
    expect(proxyAwareFetch).toHaveBeenCalledTimes(1);
    const [url, opts, proxyOptions] = proxyAwareFetch.mock.calls[0];
    expect(url).toBe(USAGE_URL);
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe("Bearer sk-or-test");
    expect(proxyOptions).toBeNull();
  });

  it("parses credits + token quotas", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "My Key",
          usage: 1000,
          limit: 5000,
          is_free_tier: false,
          credits: { total: 10, used: 2, remaining: 8 },
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test",
    });

    expect(usage.quotas["Credits (USD)"]).toMatchObject({
      used: 2,
      total: 10,
      remainingPercentage: 80,
      unlimited: false,
    });
    expect(usage.quotas["Tokens (monthly)"]).toMatchObject({
      used: 1000,
      total: 5000,
      remainingPercentage: 80,
      unlimited: false,
    });
  });

  it("handles free tier (is_free_tier true)", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "Free Key",
          usage: null,
          limit: null,
          is_free_tier: true,
          credits: null,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test",
    });

    expect(usage.plan).toBe("OpenRouter (Free Tier)");
    expect(usage.quotas).toEqual({});
    expect(usage.message).toMatch(/no quota data/i);
  });

  it("handles unlimited token key (limit null) with usage present", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({
        data: {
          label: "Unlimited Key",
          usage: 500,
          limit: null,
          is_free_tier: false,
          credits: null,
        },
      }),
    );

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test",
    });

    expect(usage.quotas["Tokens (monthly)"]).toMatchObject({
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
      apiKey: "sk-or-test",
    });
    expect(auth.message).toMatch(/auth|key/i);
  });

  it("returns soft message (not an error) on 429", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      response({ error: "rate_limited" }, { status: 429 }),
    );
    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test",
    });
    expect(usage.error).toBeUndefined();
    expect(usage.message).toMatch(/429/i);
  });
});

describe("parseQuotaData(openrouter)", () => {
  it("forwards used/total/remainingPercentage for the dashboard table", () => {
    const rows = parseQuotaData("openrouter", {
      plan: "OpenRouter",
      quotas: {
        "Credits (USD)": { used: 2, total: 10, remainingPercentage: 80 },
        "Tokens (monthly)": { used: 1000, total: 5000, remainingPercentage: 80 },
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Credits (USD)",
      used: 2,
      total: 10,
    });
    expect(rows[1]).toMatchObject({
      name: "Tokens (monthly)",
      used: 1000,
      total: 5000,
    });
  });
});