import { describe, it, expect } from "vitest";
import { buildHookContext, expandTemplate, extractText } from "@/shared/hookTemplate.js";

const DETAIL = {
  model: "gpt-4",
  provider: "openai",
  sourceApp: "claude-code",
  conversationId: "conv-123",
  status: "success",
  errorCategory: null,
  timestamp: "2026-09-16T00:00:00.000Z",
  request: { messages: [{ role: "user", content: "hello" }], model: "gpt-4" },
  response: { content: "hi there", _truncated: true },
};

describe("hookTemplate (M5)", () => {
  it("buildHookContext exposes message fields", () => {
    const ctx = buildHookContext(DETAIL, "req-1");
    expect(ctx.id).toBe("req-1");
    expect(ctx.model).toBe("gpt-4");
    expect(ctx.sourceApp).toBe("claude-code");
    expect(ctx.conversationId).toBe("conv-123");
    expect(ctx.status).toBe("success");
    expect(ctx.content).toBe("hi there");
    expect(ctx.prompt).toBe("hello");
  });

  it("expandTemplate substitutes raw values in text templates", () => {
    const out = expandTemplate("model={{model}} app={{sourceApp}} conv={{conversationId}}", buildHookContext(DETAIL, "req-1"));
    expect(out).toBe("model=gpt-4 app=claude-code conv=conv-123");
  });

  it("expandTemplate JSON-encodes values in JSON templates", () => {
    const tpl = '{"model": "{{model}}", "content": "{{content}}"}';
    const out = expandTemplate(tpl, buildHookContext(DETAIL, "req-1"));
    const parsed = JSON.parse(out);
    expect(parsed.model).toBe("gpt-4");
    expect(parsed.content).toBe("hi there");
  });

  it("leaves unknown placeholders untouched", () => {
    const out = expandTemplate("{{unknown}} {{model}}", buildHookContext(DETAIL, "req-1"));
    expect(out).toBe("{{unknown}} gpt-4");
  });

  it("extractText handles strings, arrays, and nested content", () => {
    expect(extractText("plain")).toBe("plain");
    expect(extractText([{ text: "a" }, { content: [{ text: "b" }] }, "c"])).toBe("a\nb\nc");
    expect(extractText(null)).toBe("");
    expect(extractText(undefined)).toBe("");
  });
});