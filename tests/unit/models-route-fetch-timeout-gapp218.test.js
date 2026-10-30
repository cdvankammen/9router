/**
 * Regression test: /v1/models fetch timeout (GAP-P2-18)
 *
 * Verifies that fetchCompatibleModelIds — called by buildModelsList for
 * OpenAI-compatible providers with no static/enabled models — applies an
 * AbortController signal to its fetch() call, bounding the /v1/models route
 * even when the upstream provider hangs indefinitely.
 *
 * Background: the gap scanner flagged "no AbortSignal.timeout()" at line 200.
 * The code already uses the equivalent AbortController.abort() pattern (5 s)
 * added in commit 838d9a7a (fix: add 5s timeout to fetchCompatibleModelIds).
 * This test locks the behavior so the guard cannot be silently removed.
 *
 * Anti-false-positive verified: intentionally breaking the signal wiring makes
 * the "timeout guard exists" assertions fail; restoring passes.
 *
 * Run: cd tests && npx vitest run \
 *   unit/models-route-fetch-timeout-gapp218.test.js --reporter=verbose
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn().mockResolvedValue([]),
  getCombos: vi.fn().mockResolvedValue([]),
  getCustomModels: vi.fn().mockResolvedValue([]),
  getModelAliases: vi.fn().mockResolvedValue({}),
  getDisabledModels: vi.fn().mockResolvedValue({}),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────
vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getCombos: mocks.getCombos,
  getCustomModels: mocks.getCustomModels,
  getModelAliases: mocks.getModelAliases,
}));
vi.mock("@/lib/disabledModelsDb", () => ({
  getDisabledModels: mocks.getDisabledModels,
}));
vi.mock("@/shared/constants/models", () => ({
  PROVIDER_MODELS: {},
  PROVIDER_ID_TO_ALIAS: {},
  getModelKind: () => null,
}));
vi.mock("@/shared/constants/providers", () => ({
  AI_PROVIDERS: {},
  ALIAS_TO_ID: {},
  FREE_PROVIDERS: [],
  getProviderAlias: () => null,
  isAnthropicCompatibleProvider: () => false,
  isOpenAICompatibleProvider: (id) =>
    typeof id === "string" && id.startsWith("openai-compatible-"),
}));
vi.mock("open-sse/services/kiroModels.js", () => ({ resolveKiroModels: vi.fn() }));
vi.mock("open-sse/services/kimchiModels.js", () => ({ resolveKimchiModels: vi.fn() }));
vi.mock("open-sse/services/qoderModels.js", () => ({
  resolveQoderModels: vi.fn(),
  routableQoderModels: vi.fn(),
}));
vi.mock("open-sse/services/copilotModels.js", () => ({ resolveCopilotModels: vi.fn() }));
vi.mock("open-sse/services/clinepassModels.js", () => ({
  resolveClinepassModels: vi.fn(),
  resolveClineModels: vi.fn(),
}));
vi.mock("open-sse/services/grokCliModels.js", () => ({ resolveGrokCliModels: vi.fn() }));
vi.mock("open-sse/services/cursorModels.js", () => ({ resolveCursorModels: vi.fn() }));
vi.mock("open-sse/shared/zedAuth.js", () => ({ resolveZedModels: vi.fn() }));
vi.mock("@/sse/services/tokenRefresh", () => ({ updateProviderCredentials: vi.fn() }));
vi.mock("@/lib/network/connectionProxy", () => ({ resolveConnectionProxyConfig: vi.fn() }));
vi.mock("open-sse/providers/capabilities.js", () => ({
  capabilitiesFromServiceKind: () => null,
  getCapabilitiesForModel: () => null,
}));

// ─── System-under-test ────────────────────────────────────────────────────
const { buildModelsList } = await import(
  "../../src/app/api/v1/models/route.js"
);

// ─── Test helpers ─────────────────────────────────────────────────────────

/** Connection that forces the dynamic-fetch path: OpenAI-compatible, no static
 *  models, no enabledModels — the only route through which
 *  fetchCompatibleModelIds() is called. */
const HANGING_PROVIDER_CONN = Object.freeze({
  id: "test-conn-hang",
  provider: "openai-compatible-chat-hang",
  apiKey: "sk-test-timeout",
  isActive: true,
  providerSpecificData: Object.freeze({
    baseUrl: "https://provider-hang.test/v1",
    prefix: "hang-test",
  }),
});

const ORIG_FETCH = globalThis.fetch;

describe("GAP-P2-18: /v1/models fetch timeout guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getProviderConnections.mockResolvedValue([HANGING_PROVIDER_CONN]);
    mocks.getCombos.mockResolvedValue([]);
    mocks.getCustomModels.mockResolvedValue([]);
    mocks.getModelAliases.mockResolvedValue({});
    mocks.getDisabledModels.mockResolvedValue({});
  });

  afterEach(() => {
    globalThis.fetch = ORIG_FETCH;
    vi.useRealTimers();
  });

  it("returns in bounded time when upstream fetch hangs (AbortController fires)", async () => {
    // Mock fetch to never resolve unless aborted — simulates a hanging upstream provider.
    let fetchCalledWith;
    globalThis.fetch = vi.fn(async (_url, opts) => {
      fetchCalledWith = { url: _url, opts };
      return new Promise((_resolve, reject) => {
        if (opts?.signal) {
          if (opts.signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          opts.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }
        // Otherwise never resolves
      });
    });

    const resultPromise = buildModelsList(["llm"]);

    // Advance timers past the 5s AbortController timeout
    await vi.advanceTimersByTimeAsync(6000);

    const result = await resultPromise;

    // The fetch was actually called with the correct URL and a signal.
    expect(fetchCalledWith).toBeDefined();
    expect(fetchCalledWith.url).toBe("https://provider-hang.test/v1/models");
    expect(fetchCalledWith.opts.signal).toBeDefined();
    expect(typeof fetchCalledWith.opts.signal.addEventListener).toBe("function");

    // The route did NOT hang — the AbortController fired and catch returned [].
    expect(result).toEqual([]);
  }, 15000);

  it("anti-false-positive: signal wired to fetch prevents indefinite hang", async () => {
    // Capture the signal and verify it gets aborted — proves the AbortController
    // signal is reaching fetch. Without the signal, this test would time out.
    let capturedSignal;
    globalThis.fetch = vi.fn(async (_url, opts) => {
      capturedSignal = opts?.signal;
      return new Promise((_resolve, reject) => {
        if (opts?.signal) {
          if (opts.signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          opts.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }
      });
    });

    const resultPromise = buildModelsList(["llm"]);
    await vi.advanceTimersByTimeAsync(6000);
    const result = await resultPromise;

    expect(capturedSignal).toBeDefined();
    expect(typeof capturedSignal.addEventListener).toBe("function");
    expect(capturedSignal.aborted).toBe(true);
    expect(result).toEqual([]);
  }, 15000);
});
