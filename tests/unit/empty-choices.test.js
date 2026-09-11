// GAP-RETRY-01: 'Response contained no choices' semantic validation tests.
//
// Verifies that HTTP 200 responses with empty choices arrays (a common upstream
// provider bug) are rejected at the handler level and trigger the combo/fallback
// retry chain instead of being forwarded to the client.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

const { validateResponseBody, isMalformedResponse } = await import(
  "../../open-sse/utils/responseValidator.js"
);
const { parseSSEToOpenAIResponse } = await import(
  "../../open-sse/handlers/chatCore/sseToJsonHandler.js"
);

// ---------------------------------------------------------------------------
// responseValidator — core semantic validation logic
// ---------------------------------------------------------------------------
describe("validateResponseBody — EMPTY_CHOICES detection", () => {
  it("rejects {choices: []} (canonical case)", () => {
    const body = { choices: [] };
    expect(validateResponseBody(body)).toEqual(
      expect.objectContaining({ valid: false, reasons: ["EMPTY_CHOICES"] })
    );
  });

  it("rejects {choices: [{}]} (no usable content)", () => {
    const body = { choices: [{}] };
    // Empty choice object has no message.content and no delta.content
    expect(validateResponseBody(body)).toEqual(
      expect.objectContaining({ valid: false })
    );
  });

  it("accepts valid chat.completion with content", () => {
    const body = {
      choices: [
        { message: { role: "assistant", content: "Hello" }, finish_reason: "stop" },
      ],
    };
    expect(validateResponseBody(body)).toEqual(
      expect.objectContaining({ valid: true, reasons: [] })
    );
  });

  it("accepts tool_calls-only response (content null)", () => {
    const body = {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "c1", type: "function", function: { name: "t", arguments: "{}" } }],
          },
          finish_reason: "tool_calls",
        },
      ],
    };
    expect(validateResponseBody(body)).toEqual(
      expect.objectContaining({ valid: true, reasons: [] })
    );
  });

  it("rejects null body", () => {
    expect(validateResponseBody(null)).toEqual(
      expect.objectContaining({ valid: false, reasons: ["EMPTY_BODY"] })
    );
  });

  it("rejects non-object body (string)", () => {
    expect(validateResponseBody("html error page")).toEqual(
      expect.objectContaining({ valid: false, reasons: ["NON_OBJECT_BODY"] })
    );
  });

  it("rejects finish_reason: error", () => {
    const body = {
      choices: [{ message: { content: "" }, finish_reason: "error" }],
    };
    expect(validateResponseBody(body)).toEqual(
      expect.objectContaining({ valid: false, reasons: ["FINISH_REASON_ERROR"] })
    );
  });
});

describe("isMalformedResponse — convenience wrapper", () => {
  it("returns shouldReject: true for empty choices", () => {
    expect(isMalformedResponse({ choices: [] })).toEqual({
      shouldReject: true,
      reasons: ["EMPTY_CHOICES"],
    });
  });

  it("returns shouldReject: false for valid body", () => {
    expect(
      isMalformedResponse({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      })
    ).toEqual({ shouldReject: false, reasons: [] });
  });
});

// ---------------------------------------------------------------------------
// parseSSEToOpenAIResponse — SSE-to-JSON conversion
// ---------------------------------------------------------------------------
describe("parseSSEToOpenAIResponse — empty choices edge cases", () => {
  it("returns null for a completely empty SSE stream", () => {
    expect(parseSSEToOpenAIResponse("", "test-model")).toBeNull();
  });

  it("parses normal SSE into a body with choices", () => {
    const raw =
      'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
    const result = parseSSEToOpenAIResponse(raw, "test-model");
    expect(result).toBeTruthy();
    expect(result.choices).toBeDefined();
  });

  it("parses an SSE stream with only [DONE] (no data events) into empty choices", () => {
    const raw = "data: [DONE]\n\n";
    const result = parseSSEToOpenAIResponse(raw, "test-model");
    // No data events → choices is empty or missing — downstream handler should reject
    expect(result).not.toBeNull();
    // Either choices is [] or choices is undefined; both are non-usable
    expect(result.choices?.length ?? 0).toBe(0);
  });
});
