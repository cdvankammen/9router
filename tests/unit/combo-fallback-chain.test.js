// Tests for combo fallback chain observability in handleComboChat.
// Verifies: attempts are recorded oldest-first, success short-circuits with
// chain on the response header, all-failed includes chain in error body.
import { describe, it, expect } from "vitest";
import { handleComboChat } from "open-sse/services/combo.js";

const noopLog = { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} };

function fakeResponse(ok, status, errorMsg = null) {
  const headers = new Headers();
  const body = errorMsg
    ? JSON.stringify({ error: { message: errorMsg } })
    : JSON.stringify({ choices: [{ message: { content: "ok" } }] });
  return {
    ok,
    status,
    statusText: errorMsg ? errorMsg : "OK",
    headers,
    clone: () => fakeResponse(ok, status, errorMsg),
    json: async () => JSON.parse(body),
    text: async () => body,
  };
}

describe("combo fallback chain observability", () => {
  it("records failed attempts oldest-first, then success with header chain", async () => {
    const attempts = [];
    const handleSingleModel = async (_body, modelStr) => {
      if (modelStr.includes("fail-")) {
        return fakeResponse(false, 503, "overloaded");
      }
      return fakeResponse(true, 200);
    };

    const result = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/fail-1", "anthropic/fail-2", "deepseek/ok"],
      handleSingleModel,
      log: noopLog,
      comboName: "test-combo",
      onFallbackEvent: (a) => attempts.push(a),
    });

    expect(result.ok).toBe(true);
    // Real assertions on the chain contents
    expect(attempts.length).toBe(3);
    expect(attempts.map((a) => a.model)).toEqual(["openai/fail-1", "anthropic/fail-2", "deepseek/ok"]);
    expect(attempts[0].ok).toBe(false);
    expect(attempts[0].status).toBe(503);
    expect(attempts[2].ok).toBe(true);
    expect(attempts.every((a) => typeof a.latencyMs === "number")).toBe(true);

    // Success header carries the chain so clients/observability can see it
    const header = result.headers.get("x-9r-fallback-chain");
    expect(header).toBeTruthy();
    const chain = JSON.parse(header);
    expect(chain.length).toBe(3);
    expect(chain[0].model).toBe("openai/fail-1");
  });

  it("single attempt success → no header (no fallback happened)", async () => {
    const handleSingleModel = async () => fakeResponse(true, 200);
    const result = await handleComboChat({
      body: { messages: [] },
      models: ["openai/ok"],
      handleSingleModel,
      log: noopLog,
    });
    expect(result.ok).toBe(true);
    expect(result.headers.get("x-9r-fallback-chain")).toBeNull();
  });

  it("all models fail → error body includes full fallback chain", async () => {
    const handleSingleModel = async (_b, modelStr) =>
      fakeResponse(false, 429, `rate limited on ${modelStr}`);

    const result = await handleComboChat({
      body: { messages: [] },
      models: ["openai/a", "anthropic/b"],
      handleSingleModel,
      log: noopLog,
    });

    expect(result.ok).toBe(false);
    const body = await result.json();
    expect(body.error.message).toContain("rate limited");
    // Chain embedded in the 503 error payload
    expect(body.fallbackChain).toBeDefined();
    expect(body.fallbackChain.length).toBe(2);
    expect(body.fallbackChain[1].model).toBe("anthropic/b");
    expect(body.fallbackChain[1].status).toBe(429);
  });
});
