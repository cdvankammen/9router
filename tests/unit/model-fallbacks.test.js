// Tests for per-model / per-provider fallback chains (settings.modelFallbacks).
// Verifies the interception in handleSingleModelChat routes single-model
// requests through the combo engine with the configured chain.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSettings = vi.fn();
const mockGetModelInfo = vi.fn();
const mockHandleComboChat = vi.fn(async () => ({ ok: true, status: 200 }));
const mockGetProviderCredentials = vi.fn();

vi.mock("@/lib/localDb", () => ({
  getSettings: (...a) => mockGetSettings(...a),
  getProviderConnectionById: async () => null,
  updateProviderConnection: async () => {},
}));
vi.mock("@/sse/services/model.js", () => ({
  getModelInfo: (...a) => mockGetModelInfo(...a),
  getComboModels: async () => null,
}));
vi.mock("@/sse/services/auth.js", () => ({
  getProviderCredentials: (...a) => mockGetProviderCredentials(...a),
  markAccountUnavailable: async () => ({ shouldFallback: false }),
  clearAccountError: async () => {},
  extractApiKey: () => null,
  isValidApiKey: () => true,
}));
vi.mock("open-sse/services/combo.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    handleComboChat: (...a) => mockHandleComboChat(...a),
    handleFusionChat: async () => ({ ok: true }),
    detectRequiredCapabilities: () => new Set(),
  };
});
vi.mock("open-sse/services/capacityAdapter.js", () => ({
  augmentModelsWithCapacityAdapter: (models) => models, // sync, like the real one
  withCapacityAdapterStripping: (fn) => fn,
  getActiveAdapterStrategy: () => "fallback",
}));

import { handleChat } from "@/sse/handlers/chat.js";

function makeRequest(body) {
  return new Request("http://localhost/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "test" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetModules();
  mockGetSettings.mockReset();
  mockGetModelInfo.mockReset();
  mockHandleComboChat.mockReset();
  mockGetProviderCredentials.mockReset();
  mockHandleComboChat.mockImplementation(async ({ models }) => ({ ok: true, status: 200, models }));
  mockGetProviderCredentials.mockResolvedValue({ id: "noauth", accessToken: "public", providerSpecificData: {} });
  mockGetModelInfo.mockImplementation(async (m) => {
    const [provider, model] = m.split("/");
    return { provider, model };
  });
});

describe("per-model / per-provider fallback chains", () => {
  it("routes a single model through the combo engine when it has configured fallbacks", async () => {
    mockGetSettings.mockResolvedValue({
      modelFallbacks: { "openai/gpt-4o": ["anthropic/claude-sonnet-4.6", "deepseek/chat"] },
      smartRouter: { enabled: false },
      comboStrategies: {},
      comboStrategy: "fallback",
      capacityAdapter: {},
    });

    const res = await handleChat(makeRequest({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "hi" }],
    }));

    expect(res.ok).toBe(true);
    expect(mockHandleComboChat).toHaveBeenCalledTimes(1);
    const [args] = mockHandleComboChat.mock.calls[0];
    // Chain = requested model first, then configured fallbacks
    expect(args.models).toEqual(["openai/gpt-4o", "anthropic/claude-sonnet-4.6", "deepseek/chat"]);
    expect(args.comboStrategy).toBe("fallback");
  });

  it("applies provider-level fallback to any model from that provider", async () => {
    mockGetSettings.mockResolvedValue({
      modelFallbacks: { openai: ["deepseek/chat"] },
      smartRouter: { enabled: false },
      comboStrategies: {},
      comboStrategy: "fallback",
      capacityAdapter: {},
    });

    await handleChat(makeRequest({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    }));

    expect(mockHandleComboChat).toHaveBeenCalledTimes(1);
    const [args] = mockHandleComboChat.mock.calls[0];
    expect(args.models[0]).toBe("openai/gpt-4o-mini");
    expect(args.models).toContain("deepseek/chat");
  });

  it("does NOT wrap when no fallbacks configured (normal single-model path)", async () => {
    mockGetSettings.mockResolvedValue({
      modelFallbacks: {},
      smartRouter: { enabled: false },
      comboStrategies: {},
      comboStrategy: "fallback",
      capacityAdapter: {},
    });

    const res = await handleChat(makeRequest({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "hi" }],
    }));

    expect(mockHandleComboChat).not.toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it("dedupes fallback equal to the requested model", async () => {
    mockGetSettings.mockResolvedValue({
      modelFallbacks: { "openai/gpt-4o": ["openai/gpt-4o", "deepseek/chat"] },
      smartRouter: { enabled: false },
      comboStrategies: {},
      comboStrategy: "fallback",
      capacityAdapter: {},
    });

    await handleChat(makeRequest({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "hi" }],
    }));

    const [args] = mockHandleComboChat.mock.calls[0];
    expect(args.models).toEqual(["openai/gpt-4o", "deepseek/chat"]);
  });
});
