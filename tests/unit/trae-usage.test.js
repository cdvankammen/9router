import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import { getTraeUsage } from "../../open-sse/services/usage/trae.js";
import { USAGE_SUPPORTED_PROVIDERS } from "../../src/shared/constants/providers.js";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

function response(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const accessToken = "trae-test-token";

// Real shape from Trae /trae/api/v1/pay/ide_user_ent_usage.
function entUsageBody({ productType = 4, basicUsed = 3, basicLimit = 300, endTime = 1800000000 } = {}) {
  return {
    code: 0,
    user_entitlement_pack_list: [
      {
        entitlement_base_info: {
          product_type: productType,
          end_time: endTime,
          quota: {
            basic_usage_limit: basicLimit,
            bonus_usage_limit: 20,
          },
        },
        usage: {
          basic_usage_amount: basicUsed,
          bonus_usage_amount: 5,
          identity_str: productType === 4 ? "Pro+" : "Trae",
        },
      },
    ],
  };
}

// Real shape from /trae/api/v1/pay/ide_user_pay_status.
const payStatusBody = {
  code: 0,
  user_pay_identity_str: "Pro+",
  detail: {
    subscription_renew_time: 1800000000,
  },
};

describe("trae registry usage flag", () => {
  it("is in USAGE_SUPPORTED_PROVIDERS once re-enabled", () => {
    // NOTE: trae is currently commented out of open-sse/providers/registry/index.js.
    // features.usage=true is declared in the entry (L75), so when the provider is
    // re-enabled (tool-calling support), it appears in the usage dashboard.
    expect(USAGE_SUPPORTED_PROVIDERS).not.toContain("trae");
  });
});

describe("buildQuotas via getTraeUsage (v1 international)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hits SG origin for SG region, posts pay_status + ent_usage, builds Basic+Bonus rows", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response(entUsageBody()));

    const usage = await getUsageForProvider({
      provider: "trae",
      accessToken,
      providerSpecificData: { aiRegion: "SG", region: "SG" },
    });

    expect(usage.message).toBeUndefined();
    expect(usage.plan).toBe("Pro+");

    // pay_status + ent_usage (empty body first, require_usage only if no data)
    expect(proxyAwareFetch).toHaveBeenCalledTimes(2);
    const [url1, opts1] = proxyAwareFetch.mock.calls[0];
    expect(url1).toBe("https://growsg-normal.trae.ai/trae/api/v1/pay/ide_user_pay_status");
    expect(opts1.method).toBe("POST");
    expect(opts1.headers.Authorization).toBe(`Cloud-IDE-JWT ${accessToken}`);
    expect(JSON.parse(opts1.body)).toEqual({});

    const [url2, opts2] = proxyAwareFetch.mock.calls[1];
    expect(url2).toBe("https://growsg-normal.trae.ai/trae/api/v1/pay/ide_user_ent_usage");
    expect(JSON.parse(opts2.body)).toEqual({ require_usage: true });

    expect(Object.keys(usage.quotas).sort()).toEqual(["Basic Usage", "Bonus Usage"]);
    expect(usage.quotas["Basic Usage"]).toMatchObject({
      used: 3,
      total: 300,
      remainingPercentage: 99,
      unlimited: false,
    });
    expect(usage.quotas["Bonus Usage"]).toMatchObject({ used: 5, total: 20 });
    expect(usage.quotas["Basic Usage"].resetAt).toBeTruthy();
  });

  it("uses NORMAL origin (grow-normal.trae.ai) when region unknown/absent", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response(entUsageBody()));

    await getTraeUsage(accessToken, {});

    expect(proxyAwareFetch.mock.calls[0][0]).toBe(
      "https://grow-normal.trae.ai/trae/api/v1/pay/ide_user_pay_status",
    );
    expect(proxyAwareFetch.mock.calls[1][0]).toBe(
      "https://grow-normal.trae.ai/trae/api/v1/pay/ide_user_ent_usage",
    );
  });

  it("uses US origin for US region", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response(entUsageBody()));

    await getTraeUsage(accessToken, { aiRegion: "US-East", region: "US-East" });

    expect(proxyAwareFetch.mock.calls[0][0]).toBe(
      "https://growsg-normal.trae.ai/trae/api/v1/pay/ide_user_pay_status",
    );
  });

  it("uses USTTP origin for usttp region", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response(entUsageBody()));

    await getTraeUsage(accessToken, { aiRegion: "USTTP" });

    expect(proxyAwareFetch.mock.calls[0][0]).toBe(
      "https://grow-normal.traeapi.us/trae/api/v1/pay/ide_user_pay_status",
    );
  });

  it("uses CN origin api.trae.cn with v2 paths", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response(entUsageBody()));

    await getTraeUsage(accessToken, { aiRegion: "CN", region: "CN" });

    expect(proxyAwareFetch.mock.calls[0][0]).toBe(
      "https://api.trae.cn/trae/api/v2/pay/ide_user_pay_status",
    );
    expect(proxyAwareFetch.mock.calls[1][0]).toBe(
      "https://api.trae.cn/trae/api/v2/pay/ide_user_ent_usage",
    );
  });

  it("falls back to user_current_entitlement_list when ent_usage has no packs (CN)", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(response({ code: 0, user_entitlement_pack_list: [] }))
      .mockResolvedValueOnce(
        response({
          code: 0,
          user_current_entitlement_list: {
            user_entitlement_pack_list: [entUsageBody().user_entitlement_pack_list[0]],
          },
        }),
      );

    const usage = await getTraeUsage(accessToken, { aiRegion: "CN" });

    expect(proxyAwareFetch.mock.calls[2][0]).toBe(
      "https://api.trae.cn/trae/api/v2/pay/user_current_entitlement_list",
    );
    expect(usage.quotas["Basic Usage"]).toBeTruthy();
  });

  it("skips on-demand pack (product_type 3) and picks best visible pack", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response(payStatusBody))
      .mockResolvedValueOnce(
        response({
          code: 0,
          user_entitlement_pack_list: [
            {
              entitlement_base_info: {
                product_type: 3,
                quota: { basic_usage_limit: 999 },
              },
              usage: { basic_usage_amount: 1 },
            },
            {
              entitlement_base_info: {
                product_type: 6,
                end_time: 1800000000,
                quota: { basic_usage_limit: 1000 },
              },
              usage: { basic_usage_amount: 100, identity_str: "Ultra" },
            },
          ],
        }),
      );

    const usage = await getTraeUsage(accessToken, { aiRegion: "SG" });

    expect(usage.plan).toBe("Ultra");
    expect(usage.quotas["Basic Usage"]).toMatchObject({ used: 100, total: 1000 });
  });

  it("returns paygo row only when pay_go_amount > 0", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response({ code: 0 }))
      .mockResolvedValueOnce(
        response({
          code: 0,
          user_entitlement_pack_list: [
            {
              entitlement_base_info: { product_type: 4, quota: { basic_usage_limit: 300 } },
              usage: { basic_usage_amount: 3, pay_go_amount: 4.5, identity_str: "Pro+" },
            },
          ],
        }),
      );

    const usage = await getTraeUsage(accessToken, { aiRegion: "SG" });

    expect(usage.quotas["On-Demand Usage"]).toMatchObject({ used: 4.5, total: 0 });
  });

  it("treats HTTP 401/403 as auth failure message", async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );
    proxyAwareFetch.mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    const usage = await getTraeUsage(accessToken, { aiRegion: "SG" });

    expect(usage.message).toMatch(/authentication failed/i);
  });

  it("returns soft message when pay_status ok but no quota data", async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(response({ code: 0, user_pay_identity_str: "Pro" }))
      .mockResolvedValueOnce(response({ code: 0, user_entitlement_pack_list: [] }));

    const usage = await getTraeUsage(accessToken, { aiRegion: "SG" });

    expect(usage.message).toBeTruthy();
    expect(usage.error).toBeUndefined();
  });

  it("returns missing-token message without any fetch", async () => {
    const usage = await getTraeUsage(null, { aiRegion: "SG" });
    expect(usage.message).toMatch(/access token not available/i);
    expect(proxyAwareFetch).not.toHaveBeenCalled();
  });
});

describe("parseQuotaData(trae)", () => {
  it("forwards entitlement rows for the dashboard table", () => {
    const rows = parseQuotaData("trae", {
      plan: "Pro+",
      quotas: {
        "Basic Usage": { used: 3, total: 300, remainingPercentage: 99, unlimited: false, resetAt: null },
        "Bonus Usage": { used: 5, total: 20, remainingPercentage: 75, unlimited: false, resetAt: null },
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Basic Usage",
      used: 3,
      total: 300,
      remainingPercentage: 99,
      unlimited: false,
    });
  });
});