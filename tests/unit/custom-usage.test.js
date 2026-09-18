// Generic custom quota endpoint for custom OpenAI-compatible provider nodes.
// Covers: dispatch routing (usageUrl present → generic handler), auth modes,
// response shape normalization, gate behavior via getUsageForProvider, and
// parseQuotaData forwarding.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import { buildCustomQuota, getCustomUsage } from "../../open-sse/services/usage/custom.js";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const TEST_KEY = "sk-custom-test";

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("buildCustomQuota", () => {
  it("normalizes flat {used, limit}", () => {
    const q = buildCustomQuota({ used: 3, limit: 10 });
    expect(q).toMatchObject({
      name: "usage",
      used: 3,
      total: 10,
      remaining: 7,
      remainingPercentage: 70,
      unlimited: false,
      resetAt: null,
    });
  });

  it("prefers remaining over computed used when present", () => {
    const q = buildCustomQuota({ used: 3, limit: 10, remaining: 5 });
    expect(q.remaining).toBe(5);
    expect(q.remainingPercentage).toBe(50);
  });

  it("unwraps data envelope", () => {
    const q = buildCustomQuota({ data: { used: 1, limit: 4 } });
    expect(q.total).toBe(4);
    expect(q.remaining).toBe(3);
  });

  it("unwraps usage envelope and nested data.usage", () => {
    const q = buildCustomQuota({ data: { usage: { total_tokens: 100, limit: 1000 } } });
    expect(q).toMatchObject({ used: 0, total: 1000 });
  });

  it("unwraps {credits: {...}} and {quotas: {...}}", () => {
    expect(buildCustomQuota({ credits: { used: 2, total: 9 } })).toMatchObject({ used: 2, total: 9 });
    expect(buildCustomQuota({ quotas: { usage: { used: 2, limit: 9 } } })).toMatchObject({ used: 2, total: 9 });
  });

  it("flags unlimited when limit is null/absent", () => {
    expect(buildCustomQuota({ used: 5, limit: null })).toMatchObject({ used: 5, unlimited: true });
    expect(buildCustomQuota({ data: { used: 5 } })).toMatchObject({ used: 5, unlimited: true });
  });

  it("passes through resetAt", () => {
    const q = buildCustomQuota({ used: 1, limit: 4, resetAt: "2026-10-01T00:00:00.000Z" });
    expect(q.resetAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("returns null on non-object / no numeric keys", () => {
    expect(buildCustomQuota(null)).toBeNull();
    expect(buildCustomQuota({ hello: "world" })).toBeNull();
  });
});

describe("getUsageForProvider (custom usageUrl dispatch)", () => {
  beforeEach(() => vi.clearAllMocks());

  const customConnection = (extra = {}) => ({
    provider: "openai-compatible-chat-test123",
    apiKey: TEST_KEY,
    providerSpecificData: {
      baseUrl: "https://provider.example/v1",
      usageUrl: "https://provider.example/v1/usage",
      usageAuthMode: "bearer",
      ...extra,
    },
  });

  it("routes to the generic handler when usageUrl is set", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ used: 3, limit: 10 }));

    const usage = await getUsageForProvider(customConnection());

    expect(usage.plan).toBe("openai-compatible-chat-test123");
    expect(usage.quotas.usage).toMatchObject({ used: 3, total: 10, remaining: 7 });
    expect(proxyAwareFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = proxyAwareFetch.mock.calls[0];
    expect(url).toBe("https://provider.example/v1/usage");
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
  });

  it("uses x-api-key header for usageAuthMode=header", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ used: 1, limit: 5 }));
    await getUsageForProvider(customConnection({ usageAuthMode: "header" }));
    const [, opts] = proxyAwareFetch.mock.calls[0];
    expect(opts.headers["x-api-key"]).toBe(TEST_KEY);
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it("sends no auth header for usageAuthMode=none", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ used: 1, limit: 5 }));
    await getUsageForProvider(customConnection({ usageAuthMode: "none" }));
    const [, opts] = proxyAwareFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
    expect(opts.headers["x-api-key"]).toBeUndefined();
  });

  it("uses accessToken when apiKey is absent", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ used: 1, limit: 5 }));
    const { apiKey, ...rest } = customConnection();
    await getUsageForProvider({ ...rest, accessToken: "tok-abc" });
    expect(proxyAwareFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer tok-abc");
  });

  it("does NOT route to generic handler when usageUrl absent → not-implemented", async () => {
    const { providerSpecificData, ...rest } = customConnection();
    delete providerSpecificData.usageUrl;
    const usage = await getUsageForProvider({ ...rest, providerSpecificData });
    expect(usage.message).toBe("Usage API not implemented for openai-compatible-chat-test123");
    expect(proxyAwareFetch).not.toHaveBeenCalled();
  });

  it("empty-string usageUrl (cleared) also routes to not-implemented", async () => {
    const { providerSpecificData, ...rest } = customConnection();
    providerSpecificData.usageUrl = "";
    const usage = await getUsageForProvider({ ...rest, providerSpecificData });
    expect(usage.message).toBe("Usage API not implemented for openai-compatible-chat-test123");
    expect(proxyAwareFetch).not.toHaveBeenCalled();
  });

  it("unlimited key → 100% row", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ used: 500, limit: null }));
    const usage = await getUsageForProvider(customConnection());
    expect(usage.quotas.usage).toMatchObject({ used: 500, total: 0, unlimited: true, remainingPercentage: 100 });
  });

  it("maps 401 to soft auth message", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ error: "invalid" }, { status: 401 }));
    const usage = await getUsageForProvider(customConnection());
    expect(usage.error).toBeUndefined();
    expect(usage.message).toMatch(/auth/i);
  });

  it("maps 429 to soft rate-limit message", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({ error: "rate" }, { status: 429 }));
    const usage = await getUsageForProvider(customConnection());
    expect(usage.error).toBeUndefined();
    expect(usage.message).toMatch(/429/i);
  });

  it("missing usageUrl → configured message (not implemented)", async () => {
    const usage = await getCustomUsage({
      provider: "openai-compatible-chat-test123",
      apiKey: TEST_KEY,
      providerSpecificData: { baseUrl: "https://provider.example/v1" },
    });
    expect(usage.message).toMatch(/not configured/i);
  });
});

describe("parseQuotaData (custom provider)", () => {
  it("forwards remainingPercentage/unlimited for custom provider ids", () => {
    const rows = parseQuotaData("openai-compatible-chat-test123", {
      plan: "openai-compatible-chat-test123",
      quotas: {
        usage: { used: 3, total: 10, remaining: 7, remainingPercentage: 70, unlimited: false, resetAt: null },
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "usage",
      used: 3,
      total: 10,
      remainingPercentage: 70,
      unlimited: false,
    });
  });

  it("keeps existing generic fallback behavior for unknown providers", () => {
    const rows = parseQuotaData("openai-compatible-chat-test123", {
      quotas: { usage: { used: 1, total: 2 } },
    });
    expect(rows[0]).toMatchObject({ used: 1, total: 2 });
  });
});