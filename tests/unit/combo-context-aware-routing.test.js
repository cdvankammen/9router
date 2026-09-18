// Context-aware combo routing tests.
// Verifies: token estimation, applyContextAwareRouting reorder semantics,
// handleComboChat integration (reroute to overflowTarget, header, fallback intact).
import { describe, it, expect } from "vitest";
import { estimatePromptTokens } from "../../open-sse/utils/tokenEstimate.js";
import { applyContextAwareRouting, handleComboChat } from "../../open-sse/services/combo.js";

const noopLog = { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} };

describe("estimatePromptTokens", () => {
  it("small text prompt -> small token count", () => {
    const t = estimatePromptTokens({ messages: [{ role: "user", content: "hello world" }] });
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(50);
  });

  it("large text prompt estimates proportionally (~chars/4)", () => {
    const big = "x".repeat(400_000);
    const t = estimatePromptTokens({ messages: [{ role: "user", content: big }] });
    // 400K non-CJK chars ≈ 100K tokens + small overhead
    expect(t).toBeGreaterThan(95_000);
    expect(t).toBeLessThan(115_000);
  });

  it("CJK counts ~1 token per char (does not undercount)", () => {
    const cjk = "中".repeat(100_000);
    const t = estimatePromptTokens({ messages: [{ role: "user", content: cjk }] });
    // 100K CJK chars = ~100K tokens, NOT ~25K — the whole point of the heuristic
    expect(t).toBeGreaterThan(90_000);
    expect(t).toBeLessThan(120_000);
  });

  it("counts system + tools + messages in OpenAI shape", () => {
    const t = estimatePromptTokens({
      system: "You are a helpful assistant",
      tools: [{ type: "function", function: { name: "f", description: "d".repeat(1000) } }],
      messages: [{ role: "user", content: "hi" }],
    });
    expect(t).toBeGreaterThan(200);
  });

  it("counts Responses input + gemini contents shapes", () => {
    const a = estimatePromptTokens({ input: [{ role: "user", content: "hello" }] });
    const b = estimatePromptTokens({ contents: [{ role: "user", parts: [{ text: "hello" }] }] });
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });
});

const BASE_CONFIG = { enabled: true, overflowTarget: "dial/qwen-3.8-max-thinking", thresholdTokens: 200000 };

function hugeBody(chars = 900_000) {
  return { messages: [{ role: "user", content: "x".repeat(chars) }] };
}

describe("applyContextAwareRouting", () => {
  const models = ["dial/tencent-hy3", "dial/mimo", "dial/qwen-3.8-max-thinking", "dial/meta-muse"];

  it("disabled config -> unchanged", () => {
    const out = applyContextAwareRouting({ body: hugeBody(), models, config: { enabled: false, overflowTarget: "dial/qwen-3.8-max-thinking" }, log: noopLog });
    expect(out.rerouted).toBe(false);
    expect(out.models).toBe(models);
  });

  it("no overflowTarget -> unchanged", () => {
    const out = applyContextAwareRouting({ body: hugeBody(), models, config: { enabled: true }, log: noopLog });
    expect(out.rerouted).toBe(false);
    expect(out.models).toBe(models);
  });

  it("small prompt below threshold -> unchanged", () => {
    const out = applyContextAwareRouting({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      config: BASE_CONFIG,
      log: noopLog,
    });
    expect(out.rerouted).toBe(false);
    expect(out.models).toBe(models);
  });

  it("huge prompt -> overflowTarget moved to front, rest order preserved", () => {
    const out = applyContextAwareRouting({ body: hugeBody(900_000), models, config: BASE_CONFIG, log: noopLog });
    expect(out.rerouted).toBe(true);
    expect(out.promptTokens).toBeGreaterThan(200000);
    expect(out.models[0]).toBe("dial/qwen-3.8-max-thinking");
    expect(out.models).toEqual(["dial/qwen-3.8-max-thinking", "dial/tencent-hy3", "dial/mimo", "dial/meta-muse"]);
  });

  it("overflowTarget already first -> rerouted true, order unchanged", () => {
    const out = applyContextAwareRouting({
      body: hugeBody(900_000),
      models: ["dial/qwen-3.8-max-thinking", "dial/tencent-hy3"],
      config: BASE_CONFIG,
      log: noopLog,
    });
    expect(out.rerouted).toBe(true);
    expect(out.models[0]).toBe("dial/qwen-3.8-max-thinking");
  });

  it("overflowTarget not in list -> prepended (overflow sink)", () => {
    const out = applyContextAwareRouting({
      body: hugeBody(900_000),
      models: ["dial/a", "dial/b"],
      config: BASE_CONFIG,
      log: noopLog,
    });
    expect(out.rerouted).toBe(true);
    expect(out.models).toEqual(["dial/qwen-3.8-max-thinking", "dial/a", "dial/b"]);
  });

  it("never throws on garbage input", () => {
    expect(() => applyContextAwareRouting({ body: null, models: null, config: null, log: noopLog })).not.toThrow();
    expect(() => applyContextAwareRouting({ body: {}, models: [], config: BASE_CONFIG, log: noopLog })).not.toThrow();
  });
});

function fakeResponse(ok, status, model = "dial/tencent-hy3") {
  const headers = new Headers();
  const body = ok
    ? JSON.stringify({ model, choices: [{ message: { content: "ok" } }] })
    : JSON.stringify({ error: { message: "overloaded" } });
  return {
    ok,
    status,
    statusText: ok ? "OK" : "overloaded",
    model,
    headers,
    clone: () => fakeResponse(ok, status, model),
    json: async () => JSON.parse(body),
    text: async () => body,
  };
}

describe("handleComboChat with contextAwareRouting", () => {
  it("huge prompt -> handles overflowTarget first, x-9r-context-reroute header", async () => {
    const attempted = [];
    const handleSingleModel = async (_b, modelStr) => {
      attempted.push(modelStr);
      // overflow target succeeds, everything else would fail
      return modelStr === "dial/qwen-3.8-max-thinking"
        ? fakeResponse(true, 200, modelStr)
        : fakeResponse(false, 503, modelStr);
    };

    const result = await handleComboChat({
      body: hugeBody(900_000),
      models: ["dial/tencent-hy3", "dial/mimo", "dial/qwen-3.8-max-thinking"],
      handleSingleModel,
      log: noopLog,
      comboName: "dialTop",
      comboStrategy: "round-robin",
      contextAwareRouting: BASE_CONFIG,
    });

    expect(result.ok).toBe(true);
    expect(attempted[0]).toBe("dial/qwen-3.8-max-thinking");
    expect(attempted.length).toBe(1); // success short-circuits
    expect(result.headers.get("x-9r-context-reroute")).toBe("dial/qwen-3.8-max-thinking");
  });

  it("small prompt -> normal order (no reroute)", async () => {
    const attempted = [];
    const handleSingleModel = async (_b, modelStr) => {
      attempted.push(modelStr);
      return fakeResponse(true, 200, modelStr);
    };

    const result = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["dial/tencent-hy3", "dial/mimo", "dial/qwen-3.8-max-thinking"],
      handleSingleModel,
      log: noopLog,
      comboName: "dialTop",
      comboStrategy: "fallback", // deterministic order for this assertion
      contextAwareRouting: BASE_CONFIG,
    });

    expect(result.ok).toBe(true);
    expect(attempted[0]).toBe("dial/tencent-hy3"); // normal rotation order
    expect(result.headers.get("x-9r-context-reroute")).toBeNull();
  });

  it("huge prompt + overflow target fails -> falls back to rest of list (fallback intact)", async () => {
    const attempted = [];
    const handleSingleModel = async (_b, modelStr) => {
      attempted.push(modelStr);
      // overflow target FAILS with a MODEL-level error (429), next model succeeds.
      // Different providers so no circuit breaker kills the rest.
      if (modelStr === "dial/qwen-3.8-max-thinking") return fakeResponse(false, 429, modelStr);
      return modelStr === "groq/mimo" ? fakeResponse(true, 200, modelStr) : fakeResponse(false, 503, modelStr);
    };

    const result = await handleComboChat({
      body: hugeBody(900_000),
      models: ["openai/tencent-hy3", "groq/mimo", "dial/qwen-3.8-max-thinking"],
      handleSingleModel,
      log: noopLog,
      comboName: "dialTop",
      comboStrategy: "fallback",
      contextAwareRouting: BASE_CONFIG,
    });

    expect(result.ok).toBe(true);
    expect(attempted[0]).toBe("dial/qwen-3.8-max-thinking");
    expect(attempted).toEqual(["dial/qwen-3.8-max-thinking", "openai/tencent-hy3", "groq/mimo"]);
    // Still has the reroute header (the request did get rerouted)
    expect(result.headers.get("x-9r-context-reroute")).toBe("dial/qwen-3.8-max-thinking");
  });
});