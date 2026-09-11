/**
 * Regression test: nonStreamingHandler.js onRequestSuccess guarded chain.
 *
 * GAP-P1-05: Promise chain .then(onRequestSuccess) without .catch() would
 * crash the process on unhandled rejection if onRequestSuccess throws.
 *
 * The handler must:
 *  1. Call onRequestSuccess when the provider returns a valid response (fire-and-forget).
 *  2. NOT propagate a rejection when onRequestSuccess itself throws — the
 *     handler call must resolve normally, the response must still be returned,
 *     and the failure must be logged (console.error), not crash the process.
 *  3. Work async: onRequestSuccess may be an async function; its rejection
 *     must also be swallowed (the .catch on the chain covers the promise
 *     returned by .then()).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks for transitive deps that fail in the test env ────────────────────
vi.mock("../../open-sse/executors/index.js", () => ({
  getExecutor: vi.fn(() => ({ refreshCredentials: vi.fn().mockResolvedValue(null) })),
  hasSpecializedExecutor: vi.fn(() => false),
}));

vi.mock("../../open-sse/services/tokenRefresh.js", () => ({
  refreshWithRetry: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  default: vi.fn(),
}));

// usageDb pulls in better-sqlite3 / sql.js etc. — neutralise it for unit tests.
// NOTE: mock the ALIAS form "@/lib/usageDb.js" — that's how requestDetail.js
// and nonStreamingHandler.js import it (see tests/vitest.config.js alias).
vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
  trackPendingRequest: vi.fn(),
}));

import { handleNonStreamingResponse } from "../../open-sse/handlers/chatCore/nonStreamingHandler.js";

const VALID_COMPLETION = {
  id: "chatcmpl-test123",
  object: "chat.completion",
  model: "test-model",
  choices: [{ index: 0, message: { role: "assistant", content: "Hello!" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
};

function makeProviderResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeOptions(overrides = {}) {
  return {
    providerResponse: makeProviderResponse(VALID_COMPLETION),
    provider: "test-provider",
    model: "test-model",
    sourceFormat: "openai",
    targetFormat: "openai",
    body: { stream: false },
    stream: false,
    translatedBody: { stream: false },
    finalBody: { stream: false },
    requestStartTime: Date.now(),
    connectionId: "conn-test",
    apiKey: "sk-test",
    clientRawRequest: { endpoint: "/v1/chat/completions", body: { stream: false } },
    reqLogger: {
      logProviderResponse: vi.fn(),
      logConvertedResponse: vi.fn(),
    },
    toolNameMap: null,
    customToolNames: null,
    trackDone: vi.fn(),
    appendLog: vi.fn().mockResolvedValue(undefined),
    pxpipe: null,
    reqTag: "T",
    log: null,
    onRequestSuccess: vi.fn(),
    ...overrides,
  };
}

describe("handleNonStreamingResponse — onRequestSuccess guard (GAP-P1-05)", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("calls onRequestSuccess when provider returns a valid response", async () => {
    const onRequestSuccess = vi.fn();
    const result = await handleNonStreamingResponse(makeOptions({ onRequestSuccess }));

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    const body = await result.response.json();
    expect(body.choices?.[0]?.message?.content).toBe("Hello!");
    // Fire-and-forget: give the microtask queue a tick for the .then chain.
    await new Promise((r) => setTimeout(r, 0));
    expect(onRequestSuccess).toHaveBeenCalledOnce();
  });

  it("does NOT crash or reject when onRequestSuccess throws synchronously", async () => {
    const onRequestSuccess = vi.fn(() => {
      throw new Error("boom sync");
    });

    // The handler itself must resolve — no unhandled rejection escapes it.
    await expect(handleNonStreamingResponse(makeOptions({ onRequestSuccess }))).resolves.toBeDefined();

    await new Promise((r) => setTimeout(r, 0));

    // The throw is contained: logged, not fatal.
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logged = consoleErrorSpy.mock.calls.some((call) =>
      call.some((arg) => String(arg).includes("boom sync") || String(arg).includes("onRequestSuccess"))
    );
    expect(logged).toBe(true);
  });

  it("does NOT crash or reject when onRequestSuccess rejects asynchronously", async () => {
    const onRequestSuccess = vi.fn().mockRejectedValue(new Error("boom async"));

    await expect(handleNonStreamingResponse(makeOptions({ onRequestSuccess }))).resolves.toBeDefined();

    await new Promise((r) => setTimeout(r, 0));

    // Async rejection is also contained by the chain's .catch.
    const logged = consoleErrorSpy.mock.calls.some((call) =>
      call.some((arg) => String(arg).includes("boom async") || String(arg).includes("onRequestSuccess"))
    );
    expect(logged).toBe(true);
  });

  it("returns the translated success body while onRequestSuccess is failing (no partial result)", async () => {
    const onRequestSuccess = vi.fn().mockRejectedValue(new Error("boom"));

    const result = await handleNonStreamingResponse(makeOptions({ onRequestSuccess }));

    // Response body must be intact — handler returns { success, response: Response }
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    const body = await result.response.json();
    expect(body.choices?.[0]?.message?.content).toBe("Hello!");
  });
});