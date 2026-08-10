// Unit + integration tests for per-request cost capture:
//   - computeCost(provider, model, tokens): cost in USD + provenance labels,
//     fully fail-open (never throws, never breaks capture).
//   - buildRequestDetail: computes cost from the final merged tokens.
//   - saveRequestDetail → getRequestDetails round-trip: cost fields survive
//     storage (the Messages page reads these rows).
//
// Provenance contract:
//   "exact"       — concrete PROVIDER_PRICING / MODEL_PRICING entry
//   "estimated"   — PATTERN_PRICING glob fallback
//   "unavailable" — no pricing matched, or computation threw
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildRequestDetail, computeCost } from "open-sse/handlers/chatCore/requestDetail.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-cost-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true";
  const { initDb, updateSettings } = await import("@/lib/db/index.js");
  await initDb();
  await updateSettings({ observabilityBatchSize: 1, observabilityMaxRecords: 500 });
});

afterAll(() => {
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("computeCost — exact matches", () => {
  it("computes cost for a concrete MODEL_PRICING entry (gpt-4o-mini)", () => {
    // input $0.15/M, output $0.60/M → 1000*0.15e-6 + 500*0.60e-6 = 0.00045
    const r = computeCost("openai", "gpt-4o-mini", { prompt_tokens: 1000, completion_tokens: 500 });
    expect(r.cost).toBeCloseTo(0.00045, 10);
    expect(r.provenance).toBe("exact");
    expect(r.pricingModel).toBe("gpt-4o-mini");
  });

  it("prefers provider-specific overrides (gh:gpt-5.3-codex)", () => {
    // gh override input $1.75/M, output $14/M → 1000*1.75e-6 + 1000*14e-6 = 0.01575
    const r = computeCost("gh", "gpt-5.3-codex", { prompt_tokens: 1000, completion_tokens: 1000 });
    expect(r.cost).toBeCloseTo(0.01575, 10);
    expect(r.provenance).toBe("exact");
    expect(r.pricingModel).toBe("gh:gpt-5.3-codex");
  });

  it("strips vendor prefixes for canonical pricing (deepseek/deepseek-chat)", () => {
    // deepseek-chat input $0.14/M, output $0.28/M → 0.14e-3 + 0.28e-3 = 0.00042
    const r = computeCost("deepseek", "deepseek/deepseek-chat", { prompt_tokens: 1000, completion_tokens: 1000 });
    expect(r.cost).toBeCloseTo(0.00042, 10);
    expect(r.provenance).toBe("exact");
    expect(r.pricingModel).toBe("deepseek-chat");
  });
});

describe("computeCost — token variants", () => {
  it("accepts Claude-style input/output field names", () => {
    // claude-sonnet-4-6: input $3/M, output $15/M → 1000*3e-6 + 500*15e-6 = 0.0105
    const r = computeCost("anthropic", "claude-sonnet-4-6", { input_tokens: 1000, output_tokens: 500 });
    expect(r.cost).toBeCloseTo(0.0105, 10);
    expect(r.provenance).toBe("exact");
  });

  it("charges cached tokens at the discounted rate, cache_creation separately", () => {
    // gpt-4o-mini: input 0.15, output 0.60, cached 0.075, cache_creation 0.15
    // prompt_tokens is cache-inclusive → 600 cached are removed from the input
    // 400*0.15e-6 + 600*0.075e-6 + 400*0.60e-6 = 0.000345
    const r = computeCost("openai", "gpt-4o-mini", {
      prompt_tokens: 1000,
      cached_tokens: 600,
      completion_tokens: 400,
    });
    expect(r.cost).toBeCloseTo(0.000345, 10);
    expect(r.provenance).toBe("exact");
  });

  it("handles Claude cache_read + cache_creation together", () => {
    // claude-sonnet-4-6: input 3, cached 0.3, output 15, cache_creation 3.75
    // 400*3e-6 + 400*0.3e-6 + 500*15e-6 + 200*3.75e-6 = 0.00957
    const r = computeCost("anthropic", "claude-sonnet-4-6", {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 400,
      cache_creation_input_tokens: 200,
    });
    expect(r.cost).toBeCloseTo(0.00957, 10);
    expect(r.provenance).toBe("exact");
  });

  it("includes reasoning tokens at the reasoning rate", () => {
    // gpt-4o-mini reasoning $0.90/M → 100*0.15e-6 + 100*0.60e-6 + 50*0.90e-6 = 0.00012
    const r = computeCost("openai", "gpt-4o-mini", {
      prompt_tokens: 100,
      completion_tokens: 100,
      reasoning_tokens: 50,
    });
    expect(r.cost).toBeCloseTo(0.00012, 10);
    expect(r.provenance).toBe("exact");
  });
});

describe("computeCost — provenance fallbacks", () => {
  it("marks pattern fallbacks as estimated", () => {
    // "x-ai/grok-4.9-beta" has no concrete entry → grok-* pattern
    // (input $0.50/M, output $2/M) → 0.5e-3 + 2e-3 = 0.0025
    const r = computeCost("tokenrouter", "x-ai/grok-4.9-beta", { prompt_tokens: 1000, completion_tokens: 1000 });
    expect(r.cost).toBeCloseTo(0.0025, 10);
    expect(r.provenance).toBe("estimated");
    expect(r.pricingModel).toBe("grok-*");
  });

  it("marks unknown models as unavailable (cost 0)", () => {
    const r = computeCost("openai", "totally-unknown-model-xyz", { prompt_tokens: 1000, completion_tokens: 1000 });
    expect(r.cost).toBe(0);
    expect(r.provenance).toBe("unavailable");
    expect(r.pricingModel).toBeUndefined();
  });

  it("marks missing tokens as unavailable (cost 0)", () => {
    expect(computeCost("openai", "gpt-4o", undefined)).toEqual({ cost: 0, provenance: "unavailable", pricingModel: undefined });
    expect(computeCost("openai", "gpt-4o", null)).toEqual({ cost: 0, provenance: "unavailable", pricingModel: undefined });
    expect(computeCost("openai", null, { prompt_tokens: 100 })).toEqual({ cost: 0, provenance: "unavailable", pricingModel: undefined });
  });
});

describe("computeCost — fail-open", () => {
  it("never throws when token access throws — degrades to unavailable", () => {
    const throwingTokens = {};
    Object.defineProperty(throwingTokens, "prompt_tokens", {
      get() { throw new Error("boom"); },
      enumerable: true,
    });
    expect(() => computeCost("openai", "gpt-4o", throwingTokens)).not.toThrow();
    expect(computeCost("openai", "gpt-4o", throwingTokens)).toEqual({ cost: 0, provenance: "unavailable", pricingModel: undefined });
  });

  it("never throws for garbage tokens — degrades to unavailable", () => {
    expect(() => computeCost("openai", "gpt-4o", "not-an-object")).not.toThrow();
    expect(computeCost("openai", "gpt-4o", "not-an-object")).toEqual({ cost: 0, provenance: "unavailable", pricingModel: undefined });
  });
});

describe("buildRequestDetail — integration", () => {
  it("sets cost + provenance from the final tokens", () => {
    const detail = buildRequestDetail({
      provider: "openai",
      model: "gpt-4o-mini",
      status: "success",
      tokens: { prompt_tokens: 1000, completion_tokens: 500 },
    });
    expect(detail.cost).toBeCloseTo(0.00045, 10);
    expect(detail.costProvenance).toBe("exact");
    expect(detail.pricingModel).toBe("gpt-4o-mini");
    // Capture surface intact
    expect(detail.provider).toBe("openai");
    expect(detail.model).toBe("gpt-4o-mini");
    expect(detail.status).toBe("success");
  });

  it("computes from overrides.tokens when tokens are overridden", () => {
    const detail = buildRequestDetail(
      { provider: "openai", model: "gpt-4o-mini", tokens: { prompt_tokens: 1000, completion_tokens: 0 } },
      { tokens: { prompt_tokens: 0, completion_tokens: 1000 } }
    );
    expect(detail.cost).toBeCloseTo(1000 * 0.6e-6, 10);
  });

  it("honors an explicit overrides.cost as-is", () => {
    const detail = buildRequestDetail(
      { provider: "openai", model: "gpt-4o-mini", tokens: { prompt_tokens: 1000, completion_tokens: 1000 } },
      { cost: 123.45, costProvenance: "manual", pricingModel: "manual-entry" }
    );
    expect(detail.cost).toBe(123.45);
    expect(detail.costProvenance).toBe("manual");
    expect(detail.pricingModel).toBe("manual-entry");
  });

  it("error captures get cost 0 with provenance, not a broken detail", () => {
    const detail = buildRequestDetail({
      provider: "some-provider",
      model: "some-model",
      status: "error",
      errorCategory: "upstream_error",
      tokens: { prompt_tokens: 0, completion_tokens: 0 },
      response: { error: "boom", status: 502 },
    });
    expect(detail.cost).toBe(0);
    expect(detail.costProvenance).toBe("unavailable");
    expect(detail.status).toBe("error");
    expect(detail.errorCategory).toBe("upstream_error");
    expect(detail.response.status).toBe(502);
  });

  it("still works when tokens are absent entirely (backward compat)", () => {
    // Tokens default to zeros; pricing is still known for gpt-4o, so the
    // computed cost is exactly $0.00 with "exact" provenance.
    const detail = buildRequestDetail({ provider: "openai", model: "gpt-4o", status: "success" });
    expect(detail.cost).toBe(0);
    expect(detail.costProvenance).toBe("exact");
    expect(detail.errorCategory).toBeUndefined();
    expect(detail.tokens).toEqual({ prompt_tokens: 0, completion_tokens: 0 });
  });
});

describe("cost survives the storage round-trip", () => {
  it("saveRequestDetail → getRequestDetails keeps cost + costProvenance", async () => {
    const { saveRequestDetail } = await import("@/lib/db/index.js");
    const { getRequestDetails } = await import("@/lib/db/repos/requestDetailsRepo.js");

    const convId = `conv-cost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await saveRequestDetail(buildRequestDetail({
      provider: "openai",
      model: "gpt-4o-mini",
      connectionId: "conn-1",
      conversationId: convId,
      tokens: { prompt_tokens: 1000, completion_tokens: 500 },
      status: "success",
    }));
    await new Promise((r) => setTimeout(r, 200)); // allow flush (batchSize 1)

    const { details } = await getRequestDetails({ conversationId: convId, pageSize: 10 });
    const mine = details.find((d) => d.conversationId === convId);
    expect(mine).toBeDefined();
    expect(mine.cost).toBeCloseTo(0.00045, 10);
    expect(mine.costProvenance).toBe("exact");
    expect(mine.pricingModel).toBe("gpt-4o-mini");
    expect(mine.status).toBe("success");
  });
});
