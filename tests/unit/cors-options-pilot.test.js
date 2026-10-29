import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CORS pilot regression tests (2026-10-29).
 *
 * Verifies the two pilot routes (/api/health, /api/v1/web/fetch) honor
 * the settings-driven corsAllowedOrigins list via the shared helper:
 *
 *   - Empty allowlist → wildcard '*' (legacy behavior)
 *   - Non-empty allowlist + matching Origin → echoed Origin + Vary: Origin
 *   - Non-empty allowlist + non-matching Origin → no CORS headers (browser blocks)
 */

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  jsonResponse: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
    headers: new Headers(init?.headers || {}),
  })),
}));

vi.mock("@/lib/db/index.js", () => ({
  getSettings: mocks.getSettings,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: mocks.jsonResponse,
  },
}));

// Stub handleFetch so the web/fetch route imports without pulling in the
// full fetch handler chain.
vi.mock("@/sse/handlers/fetch.js", () => ({
  handleFetch: vi.fn(() => new Response("ok", { status: 200 })),
}));

function makeRequest(origin) {
  const h = new Headers();
  if (origin) h.set("origin", origin);
  return { headers: h, url: "http://localhost/" };
}

describe("CORS pilot — settings-driven allowlist on /api/health + /api/v1/web/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("/api/health", () => {
    it("emits wildcard when allowlist is empty (legacy behavior)", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: [] });
      const { OPTIONS } = await import("@/app/api/health/route.js");
      const res = await OPTIONS(makeRequest("https://evil.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
    });

    it("echoes Origin + Vary when allowlist matches", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { OPTIONS } = await import("@/app/api/health/route.js");
      const res = await OPTIONS(makeRequest("https://app.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
      expect(res.headers.get("Vary")).toBe("Origin");
    });

    it("emits NO CORS headers when allowlist set but Origin doesn't match", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { OPTIONS } = await import("@/app/api/health/route.js");
      const res = await OPTIONS(makeRequest("https://evil.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      // Browser will block the response because no ACAO header is present.
    });
  });

  describe("/api/v1/web/fetch", () => {
    it("emits wildcard when allowlist is empty", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: [] });
      const { OPTIONS } = await import("@/app/api/v1/web/fetch/route.js");
      const res = await OPTIONS(makeRequest());
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    });

    it("blocks disallowed Origin when allowlist is configured", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://trusted.example"] });
      const { OPTIONS } = await import("@/app/api/v1/web/fetch/route.js");
      const res = await OPTIONS(makeRequest("https://evil.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });
});
