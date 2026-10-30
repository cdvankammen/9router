import { describe, it, expect, beforeEach, vi } from "vitest";
import { mergeAnthropicBeta } from "open-sse/providers/shared.js";
import { upstreamResponseHeaders } from "open-sse/utils/upstreamHeaders.js";
import { createErrorResult, unavailableResponse } from "open-sse/utils/error.js";

const betaFlags = (headers) => (headers["Anthropic-Beta"] || "").split(",").map((s) => s.trim()).filter(Boolean);

describe("mergeAnthropicBeta", () => {
  it("unions and dedupes comma lists, ignoring blanks (whitelisted flags only)", () => {
    // Finding #306: whitelist silently drops unknown flags — use real whitelisted flags
    expect(mergeAnthropicBeta("context-management-2025-06-27", " fast-mode-2026-02-01 , structured-outputs-2025-12-15 ,", undefined, "")).toBe("context-management-2025-06-27,fast-mode-2026-02-01,structured-outputs-2025-12-15");
  });
  it("drops unknown flags per the whitelist", () => {
    expect(mergeAnthropicBeta("context-management-2025-06-27,safeguards-2026-09-01")).toBe("context-management-2025-06-27");
  });
});

describe("DefaultExecutor.buildHeaders() forwards client anthropic-beta", () => {
  let DefaultExecutor;

  beforeEach(async () => {
    vi.resetModules();
    ({ DefaultExecutor } = await import("open-sse/executors/default.js"));
  });

  it("forwards whitelisted client flags alongside the pinned set on claude", () => {
    // Finding #306: client flags are intersected with the whitelist before merging
    const executor = new DefaultExecutor("claude");
    const rawHeaders = { "anthropic-beta": "advanced-tool-use-2025-11-20,effort-2025-11-24" };
    const flags = betaFlags(executor.buildHeaders({ apiKey: "k", rawHeaders }, true, undefined, "claude-opus-5"));
    expect(flags).toContain("advanced-tool-use-2025-11-20");
    expect(flags).toContain("effort-2025-11-24");
    expect(flags).toContain("context-management-2025-06-27");
    expect(new Set(flags).size).toBe(flags.length);
  });

  it("forwards whitelisted client flags on anthropic-compatible Claude models", () => {
    const executor = new DefaultExecutor("anthropic-compatible-custom");
    const creds = { apiKey: "k", rawHeaders: { "anthropic-beta": "fast-mode-2026-02-01" }, providerSpecificData: { baseUrl: "https://gw.example.com/v1" } };
    const flags = betaFlags(executor.buildHeaders(creds, true, undefined, "claude-sonnet-5"));
    expect(flags).toContain("fast-mode-2026-02-01");
    expect(flags).not.toContain("claude-code-20250219");
  });

  it("forwards whitelisted client flags on the anthropic provider", () => {
    const executor = new DefaultExecutor("anthropic");
    const flags = betaFlags(executor.buildHeaders({ apiKey: "k", rawHeaders: { "anthropic-beta": "structured-outputs-2025-12-15" } }, true, undefined, "claude-sonnet-5"));
    expect(flags).toContain("structured-outputs-2025-12-15");
  });
});

describe("upstream response header forwarding", () => {
  const upstream = new Headers({
    "retry-after": "12",
    "x-should-retry": "false",
    "anthropic-ratelimit-unified-status": "rejected",
    "anthropic-ratelimit-unified-reset": "1790000000",
    "set-cookie": "secret=1",
    "content-length": "99",
  });

  it("picks only retry and ratelimit headers", () => {
    expect(upstreamResponseHeaders(upstream)).toEqual({
      "retry-after": "12",
      "x-should-retry": "false",
      "anthropic-ratelimit-unified-status": "rejected",
      "anthropic-ratelimit-unified-reset": "1790000000",
    });
    expect(upstreamResponseHeaders(undefined)).toEqual({});
  });

  it("attaches them to error results", () => {
    const { response } = createErrorResult(429, "limited", undefined, upstreamResponseHeaders(upstream));
    expect(response.headers.get("x-should-retry")).toBe("false");
    expect(response.headers.get("anthropic-ratelimit-unified-status")).toBe("rejected");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps the gateway retry-after on all-accounts-limited responses", () => {
    const retryAt = new Date(Date.now() + 30000).toISOString();
    const res = unavailableResponse(503, "busy", retryAt, "30s", upstreamResponseHeaders(upstream));
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(20);
    expect(res.headers.get("anthropic-ratelimit-unified-reset")).toBe("1790000000");
  });
});
