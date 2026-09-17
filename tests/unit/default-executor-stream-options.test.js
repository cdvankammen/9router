// Regression: BUG-OR-01 — OpenRouter usage/token tracking was broken because the
// generic DefaultExecutor never injected `stream_options: {include_usage: true}`.
// Without it OpenRouter returns no `usage` object on streaming responses, and the
// gateway fell back to a crude characters/4 estimate (dropping usage entirely for
// tool-only / empty-text responses).
//
// iflow.js injected stream_options; DefaultExecutor ignored the `stream` argument
// entirely. This locks the guarded injection in DefaultExecutor.transformRequest()
// plus the full supportsIncludeUsage() gate matrix.
//
// Reference implementation: open-sse/executors/iflow.js
// Gate implementation:      open-sse/executors/default.js (supportsIncludeUsage)
import { describe, it, expect } from "vitest";
import { DefaultExecutor } from "../../open-sse/executors/default.js";

const CREDS = { apiKey: "sk-or-synthetic-000000000000" };

function messages() {
  return [{ role: "user", content: "Reply only OK" }];
}

function body(extra = {}) {
  return { model: "openrouter/auto", messages: messages(), ...extra };
}

describe("DefaultExecutor stream_options injection (BUG-OR-01)", () => {
  it("injects include_usage for a streaming chat-completions request (OpenRouter)", () => {
    const ex = new DefaultExecutor("openrouter");
    const out = ex.transformRequest("openrouter/auto", body({ stream: true }), true, CREDS);

    expect(out.stream_options).toEqual({ include_usage: true });
  });

  it("does not inject for a non-streaming request", () => {
    const ex = new DefaultExecutor("openrouter");
    const out = ex.transformRequest("openrouter/auto", body({ stream: false }), false, CREDS);

    expect(out.stream_options).toBeUndefined();
  });

  it("never clobbers a caller-supplied stream_options value", () => {
    const ex = new DefaultExecutor("openrouter");
    const supplied = { include_usage: false };
    const out = ex.transformRequest(
      "openrouter/auto",
      body({ stream: true, stream_options: supplied }),
      true,
      CREDS,
    );

    expect(out.stream_options).toEqual(supplied);
  });

  it("does not inject when the body has no messages[]", () => {
    const ex = new DefaultExecutor("openrouter");
    const out = ex.transformRequest("openrouter/auto", { model: "openrouter/auto" }, true, CREDS);

    expect(out.stream_options).toBeUndefined();
  });

  it("does not inject for non-chat-completions formats (claude / gemini / openai-responses)", () => {
    const claude = new DefaultExecutor("claude");
    const claudeOut = claude.transformRequest("claude-sonnet-4-5", body({ stream: true }), true, CREDS);
    expect(claudeOut.stream_options).toBeUndefined();

    const gemini = new DefaultExecutor("gemini");
    const geminiOut = gemini.transformRequest("gemini-2.5-pro", body({ stream: true }), true, CREDS);
    expect(geminiOut.stream_options).toBeUndefined();
  });

  it("injects for openai-compatible-* chat nodes but not responses nodes", () => {
    const chatId = "openai-compatible-chat-3d8d3de8-1206-47ee-a42f-22113a5f2387";
    const responsesId = "openai-compatible-responses-11111111-2222-3333-4444-555555555555";
    const credentials = { apiKey: "sk-test", providerSpecificData: { baseUrl: "https://example.test/v1" } };

    const chatOut = new DefaultExecutor(chatId).transformRequest(
      "cx/gpt-5.6-sol", body({ stream: true }), true, credentials,
    );
    expect(chatOut.stream_options).toEqual({ include_usage: true });

    const responsesOut = new DefaultExecutor(responsesId).transformRequest(
      "cx/gpt-5.6-sol", body({ stream: true }), true, credentials,
    );
    expect(responsesOut.stream_options).toBeUndefined();
  });

  it("honors the per-provider quirks.noIncludeUsage opt-out escape hatch", () => {
    const ex = new DefaultExecutor("openrouter");
    // Simulate a registry entry opting out via transport.quirks.noIncludeUsage.
    ex.config = { ...ex.config, quirks: { ...(ex.config.quirks || {}), noIncludeUsage: true } };

    expect(ex.supportsIncludeUsage(CREDS)).toBe(false);
    const out = ex.transformRequest("openrouter/auto", body({ stream: true }), true, CREDS);
    expect(out.stream_options).toBeUndefined();
  });

  it("reports OpenRouter as include_usage capable (registry format is openai)", () => {
    const ex = new DefaultExecutor("openrouter");

    expect(ex.config.format).toBe("openai");
    expect(ex.supportsIncludeUsage(CREDS)).toBe(true);
  });
});
