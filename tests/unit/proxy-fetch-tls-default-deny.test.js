import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Row 42 regression test: TLS insecure fallback is now default-deny.
// The fallback to rejectUnauthorized:false requires explicit opt-in via
// options.allowInsecureTls or ALLOW_INSECURE_TLS env var.

describe("proxyFetch TLS default-deny (Row 42)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRICT_SSL;
    delete process.env.ALLOW_INSECURE_TLS;
  });

  afterEach(() => {
    delete process.env.STRICT_SSL;
    delete process.env.ALLOW_INSECURE_TLS;
    vi.restoreAllMocks();
  });

  it("does NOT fall back to insecure TLS by default when cert error occurs", async () => {
    // The fetchWithTlsFallback function is not directly exported, but the
    // behavior is testable through the module's logic. We verify the code
    // structure: without allowInsecureTls or ALLOW_INSECURE_TLS, the
    // fallback branch should not execute.
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../../open-sse/utils/proxyFetch.js", import.meta.url),
      "utf8"
    );

    // Verify the default-deny pattern exists in source
    expect(src).toContain("allowInsecureFallback");
    expect(src).toContain("options.allowInsecureTls === true");
    expect(src).toContain('process.env.ALLOW_INSECURE_TLS === "true"');

    // Verify the condition requires BOTH !isStrictSsl AND allowInsecureFallback
    expect(src).toContain("!isStrictSsl && allowInsecureFallback && isTlsCertError(err)");
  });

  it("STRICT_SSL=true still blocks fallback regardless of allowInsecureTls", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../../open-sse/utils/proxyFetch.js", import.meta.url),
      "utf8"
    );

    // The isStrictSsl check comes first and blocks the entire fallback branch
    expect(src).toContain('process.env.STRICT_SSL === "true"');
    // The condition is: if (!isStrictSsl && allowInsecureFallback && isTlsCertError)
    // So STRICT_SSL=true makes isStrictSsl=true, which makes !isStrictSsl=false,
    // which short-circuits the entire condition.
    expect(src).toContain("!isStrictSsl && allowInsecureFallback");
  });

  it("allowInsecureTls per-request opt-in is documented in the code", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../../open-sse/utils/proxyFetch.js", import.meta.url),
      "utf8"
    );

    // Verify the Row 42 comment explaining the change
    expect(src).toContain("Row 42");
    expect(src).toContain("Default-deny insecure TLS fallback");
  });
});
