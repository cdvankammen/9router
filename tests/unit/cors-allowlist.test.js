import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the settings DB layer BEFORE importing the module under test
vi.mock("@/lib/db/index.js", () => ({
  getSettings: vi.fn(),
}));

import { resolveCorsHeaders } from "@/shared/utils/cors.js";
import { getSettings } from "@/lib/db/index.js";

function makeRequest(origin) {
  return { headers: { get: (name) => (name === "origin" ? origin : null) } };
}

describe("resolveCorsHeaders", () => {
  beforeEach(() => {
    vi.mocked(getSettings).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns wildcard headers when allowlist is empty (legacy behavior)", async () => {
    const headers = await resolveCorsHeaders(makeRequest("https://evil.example"), {
      corsAllowedOrigins: [],
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
  });

  it("echoes origin when it matches the allowlist", async () => {
    const headers = await resolveCorsHeaders(makeRequest("https://app.example.com"), {
      corsAllowedOrigins: ["https://app.example.com"],
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
    expect(headers["Vary"]).toBe("Origin");
  });

  it("blocks disallowed origins (no CORS headers)", async () => {
    const headers = await resolveCorsHeaders(makeRequest("https://evil.example"), {
      corsAllowedOrigins: ["https://app.example.com"],
    });
    expect(Object.keys(headers)).toHaveLength(0);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("treats origin matching case-insensitively and trims whitespace", async () => {
    const headers = await resolveCorsHeaders(makeRequest("  HTTPS://APP.EXAMPLE.COM  "), {
      corsAllowedOrigins: ["https://app.example.com"],
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("HTTPS://APP.EXAMPLE.COM");
  });

  it("allows non-browser clients (no Origin header) even with allowlist set", async () => {
    const headers = await resolveCorsHeaders(makeRequest(null), {
      corsAllowedOrigins: ["https://app.example.com"],
    });
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("fetches settings from DB when not provided", async () => {
    vi.mocked(getSettings).mockResolvedValue({ corsAllowedOrigins: [] });
    const headers = await resolveCorsHeaders(makeRequest("https://evil.example"));
    expect(getSettings).toHaveBeenCalledTimes(1);
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});