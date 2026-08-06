// Tests for the error categorizer — verifies status + text rules map to
// stable categories, and unknown inputs fall back safely.
import { describe, it, expect } from "vitest";
import { categorizeError } from "open-sse/utils/errorCategorizer.js";

describe("categorizeError", () => {
  it("classifies by status code alone", () => {
    expect(categorizeError(429, "anything")).toBe("rate_limit");
    expect(categorizeError(401, "anything")).toBe("auth");
    expect(categorizeError(403, "anything")).toBe("auth");
    expect(categorizeError(402, "anything")).toBe("billing");
    expect(categorizeError(504, "anything")).toBe("timeout");
    expect(categorizeError(503, "anything")).toBe("overloaded");
    expect(categorizeError(422, "anything")).toBe("invalid_request");
  });

  it("classifies by text pattern when status is generic", () => {
    expect(categorizeError(400, "Rate limit exceeded, retry later")).toBe("rate_limit");
    expect(categorizeError(400, "Invalid API key provided")).toBe("auth");
    expect(categorizeError(400, "Content was flagged by our safety system")).toBe("content_filter");
    expect(categorizeError(500, "ECONNREFUSED while connecting to upstream")).toBe("network");
    expect(categorizeError(500, "upstream timed out")).toBe("timeout");
    expect(categorizeError(400, "Billing problem on account")).toBe("billing");
  });

  it("falls back to status ranges then unknown", () => {
    expect(categorizeError(502, "weird text")).toBe("overloaded"); // 5xx fallback
    expect(categorizeError(404, "weird text")).toBe("invalid_request"); // 4xx fallback
    expect(categorizeError(null, "unrecognized gibberish")).toBe("unknown");
    expect(categorizeError(undefined, "")).toBe("unknown");
  });

  it("is case-insensitive and null-safe", () => {
    expect(categorizeError(429, null)).toBe("rate_limit");
    expect(categorizeError(200, "RATE LIMIT")).toBe("rate_limit");
    expect(categorizeError(200, "no match here")).toBe("unknown");
  });
});
