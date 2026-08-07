/**
 * Fallback-rule text format helpers (src/lib/fallbackTextFormat.js).
 *
 * Covers the Expert Text editor's serialization/parsing for BOTH storage
 * shapes (legacy array and advanced object), comments, blanks, and the
 * round-trip guarantee that applying text never drops retry config.
 */

import { describe, it, expect } from "vitest";
import { ruleModels, isAdvancedRule, toDraftText, parseDraftText } from "../../src/lib/fallbackTextFormat.js";

describe("ruleModels", () => {
  it("returns the array for the legacy shape", () => {
    expect(ruleModels(["a/b", "c/d"])).toEqual(["a/b", "c/d"]);
  });

  it("returns models for the advanced shape", () => {
    expect(ruleModels({ models: ["a/b"], retries: 3, perModelRetries: {} })).toEqual(["a/b"]);
  });

  it("returns [] for junk", () => {
    expect(ruleModels(null)).toEqual([]);
    expect(ruleModels(undefined)).toEqual([]);
    expect(ruleModels("nope")).toEqual([]);
    expect(ruleModels({})).toEqual([]);
  });
});

describe("isAdvancedRule", () => {
  it("true for advanced object with models array", () => {
    expect(isAdvancedRule({ models: [], retries: 1 })).toBe(true);
  });

  it("false for arrays and junk", () => {
    expect(isAdvancedRule(["a/b"])).toBe(false);
    expect(isAdvancedRule(null)).toBe(false);
    expect(isAdvancedRule({ retries: 1 })).toBe(false);
  });
});

describe("toDraftText", () => {
  it("serializes the legacy shape", () => {
    expect(toDraftText({ "openai/gpt-4o": ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.6"] }))
      .toBe("openai/gpt-4o:openai/gpt-4o-mini,anthropic/claude-sonnet-4.6");
  });

  it("serializes the advanced shape (uses models only)", () => {
    expect(toDraftText({
      anthropic: { models: ["openai/gpt-4o", "deepseek/deepseek-chat"], retries: 5, perModelRetries: { "openai/gpt-4o": 2 } },
    })).toBe("anthropic:openai/gpt-4o,deepseek/deepseek-chat");
  });

  it("handles empty map", () => {
    expect(toDraftText({})).toBe("");
    expect(toDraftText(null)).toBe("");
  });
});

describe("parseDraftText", () => {
  it("parses lines into the legacy shape by default", () => {
    const out = parseDraftText("openai/gpt-4o:openai/gpt-4o-mini,anthropic/claude-sonnet-4.6\nanthropic:openai/gpt-4o");
    expect(out).toEqual({
      "openai/gpt-4o": ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.6"],
      anthropic: ["openai/gpt-4o"],
    });
  });

  it("ignores blank lines and # comments", () => {
    const out = parseDraftText("# comment\n\nopenai/gpt-4o:a/b\n   \n# another\n");
    expect(out).toEqual({ "openai/gpt-4o": ["a/b"] });
  });

  it("skips malformed lines (no colon, empty target, empty chain)", () => {
    const out = parseDraftText("no-colon-here\n:fallback\nopenai/gpt-4o:\n  :  \n");
    expect(out).toEqual({});
  });

  it("preserves the advanced shape (retries + perModelRetries) on re-parse", () => {
    const existing = {
      "openai/gpt-4o": { models: ["openai/gpt-4o-mini"], retries: 3, perModelRetries: { "openai/gpt-4o-mini": 5 } },
    };
    const out = parseDraftText("openai/gpt-4o:anthropic/claude-sonnet-4.6,deepseek/deepseek-chat", existing);
    expect(out["openai/gpt-4o"]).toEqual({
      models: ["anthropic/claude-sonnet-4.6", "deepseek/deepseek-chat"],
      retries: 3,
      perModelRetries: { "openai/gpt-4o-mini": 5 },
    });
  });

  it("round-trips: toDraftText then parseDraftText keeps the chain identical", () => {
    const map = {
      "openai/gpt-4o": ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.6"],
      anthropic: { models: ["openai/gpt-4o"], retries: 2, perModelRetries: {} },
    };
    const parsed = parseDraftText(toDraftText(map), map);
    expect(parsed["openai/gpt-4o"]).toEqual(["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.6"]);
    expect(parsed.anthropic).toEqual({ models: ["openai/gpt-4o"], retries: 2, perModelRetries: {} });
  });
});
