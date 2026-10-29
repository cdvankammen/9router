/**
 * CORS Phase 5 — integration tests (2026-10-29).
 *
 * Verifies that actual POST/GET responses from /v1/* routes carry CORS
 * headers governed exclusively by settings.corsAllowedOrigins:
 *
 *   - Empty allowlist       → wildcard '*' (legacy behavior)
 *   - Matching Origin       → echoed Origin + Vary: Origin
 *   - Non-matching Origin   → no CORS headers (browser blocks)
 *
 * Boundary authority lives in src/shared/utils/corsOptions.js withCorsHeaders.
 * The open-sse engine strips its hardcoded wildcards (Phase 3B, c2b184a1);
 * these tests prove the app layer is the single source of truth.
 *
 * Each route is tested with its handler stubbed so we exercise the route's
 * own import of withCorsHeaders without pulling in the provider stack.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  handleEmbeddings: vi.fn(),
  handleChat: vi.fn(),
  handleSearch: vi.fn(),
}));

vi.mock("@/lib/db/index.js", () => ({
  getSettings: mocks.getSettings,
}));

// Stub the SSE handlers so the route imports cheaply and we can control
// the inner Response (which must NOT carry CORS headers itself — that's
// the boundary contract: engine emits plain responses, route wraps).
vi.mock("@/sse/handlers/embeddings.js", () => ({
  handleEmbeddings: mocks.handleEmbeddings,
}));
vi.mock("@/sse/handlers/chat.js", () => ({
  handleChat: mocks.handleChat,
}));
vi.mock("@/sse/handlers/search.js", () => ({
  handleSearch: mocks.handleSearch,
}));

// Stub translator init so chat/response routes don't actually load the
// translator registry (slow + network-touching on some providers).
vi.mock("open-sse/translator/index.js", () => ({
  initTranslators: vi.fn(),
}));

function makeRequest(origin, method = "POST") {
  const h = new Headers();
  if (origin) h.set("origin", origin);
  h.set("content-type", "application/json");
  return new Request("http://localhost/v1/embeddings", {
    method,
    headers: h,
    body: method === "POST" ? JSON.stringify({ model: "x", input: "hi" }) : undefined,
  });
}

const plainJsonResponse = () =>
  new Response(JSON.stringify({ data: [{ embedding: [0.1], index: 0 }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("CORS Phase 5 — POST responses honor the allowlist at the route boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handleEmbeddings.mockResolvedValue(plainJsonResponse());
    mocks.handleChat.mockResolvedValue(plainJsonResponse());
    mocks.handleSearch.mockResolvedValue(plainJsonResponse());
  });

  describe("/v1/embeddings (non-streaming JSON)", () => {
    it("emits wildcard ACAO when allowlist is empty (legacy)", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: [] });
      const { POST } = await import("@/app/api/v1/embeddings/route.js");
      const res = await POST(makeRequest("https://anywhere.example"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("echoes Origin + Vary when allowlist matches", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { POST } = await import("@/app/api/v1/embeddings/route.js");
      const res = await POST(makeRequest("https://app.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
      expect(res.headers.get("Vary")).toBe("Origin");
    });

    it("blocks disallowed Origin (no ACAO header)", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { POST } = await import("@/app/api/v1/embeddings/route.js");
      const res = await POST(makeRequest("https://evil.example.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("strips any leaked ACAO from the engine response (defense-in-depth)", async () => {
      // Even if the handler (engine) somehow returned ACAO:*, the route
      // wrapper must strip it before applying the allowlist.
      mocks.handleEmbeddings.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        })
      );
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { POST } = await import("@/app/api/v1/embeddings/route.js");
      const res = await POST(makeRequest("https://evil.example.com"));
      // Disallowed origin + engine-leaked wildcard → wrapper strips the leak,
      // applies empty CORS headers → browser blocks.
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("/v1/chat/completions (POST, streaming intent)", () => {
    it("applies allowlist to chat responses", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { POST } = await import("@/app/api/v1/chat/completions/route.js");
      const req = new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: "x", messages: [] }),
      });
      const res = await POST(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    });

    it("blocks disallowed origin on chat endpoint", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://trusted.example"] });
      const { POST } = await import("@/app/api/v1/chat/completions/route.js");
      const req = new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: "x", messages: [] }),
      });
      const res = await POST(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("/v1/search (POST)", () => {
    it("applies allowlist to search responses", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: [] });
      const { POST } = await import("@/app/api/v1/search/route.js");
      const req = new Request("http://localhost/v1/search", {
        method: "POST",
        headers: {
          origin: "https://anywhere.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: "tavily", query: "hi" }),
      });
      const res = await POST(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("non-browser clients (no Origin header)", () => {
    it("returns no CORS headers when allowlist is set and Origin absent (curl/SDK)", async () => {
      mocks.getSettings.mockResolvedValue({ corsAllowedOrigins: ["https://app.example.com"] });
      const { POST } = await import("@/app/api/v1/embeddings/route.js");
      const req = new Request("http://localhost/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "x", input: "hi" }),
      });
      const res = await POST(req);
      // Non-browser clients (no Origin) don't need CORS headers; the
      // response is still fully usable.
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.status).toBe(200);
    });
  });
});
