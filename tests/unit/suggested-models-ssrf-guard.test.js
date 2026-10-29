/**
 * SSRF guard on GET /api/providers/suggested-models (#3782 + 2026-10-29 hardening).
 *
 * The route accepts a ?url= param and fetches it server-side to retrieve
 * third-party model catalogs (OpenRouter, OpenCode, MiMo, MiniMax, Nous).
 *
 * Defense layers (all tested here):
 *   1. requireAuth - dashboard JWT or CLI machine-id token required
 *   2. ALLOWED_CATALOG_HOSTS - only known catalog hosts permitted
 *   3. Scheme check - http/https only
 *   4. Credentials-in-URL block
 *   5. fetchPublic - DNS-resolution SSRF guard + redirect-safe fetch
 *
 * Original v3 commit 4768482d added the SSRF guard but it was lost during
 * the v4/v5 merge. Replay-applied with additional defense-in-depth.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  fetchPublic: vi.fn(),
}));

vi.mock("@/lib/auth/requireAuth.js", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/shared/utils/ssrfGuard.js", () => ({
  fetchPublic: mocks.fetchPublic,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));

const { GET } = await import(
  "@/app/api/providers/suggested-models/route.js"
);

function requestWith(url, type, authHeader) {
  const base = "http://gateway.example.com/api/providers/suggested-models";
  const params = new URLSearchParams();
  if (url !== undefined) params.set("url", url);
  if (type !== undefined) params.set("type", type);
  return new Request(base + "?" + params.toString(), {
    headers: { Authorization: authHeader || "Bearer valid-token" },
  });
}

describe("suggested-models auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(null);
  });

  it("rejects unauthenticated requests before any URL processing", async () => {
    mocks.requireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models"));
    expect(res.status).toBe(401);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });
});

describe("suggested-models host allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(null);
  });

  it("rejects disallowed hosts before calling fetchPublic", async () => {
    const res = await GET(requestWith("https://evil.example.com/models", "openrouter-free"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Blocked URL host/);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("rejects cloud metadata IPs via allowlist", async () => {
    const res = await GET(requestWith("http://169.254.169.254/latest/meta-data/", "openrouter-free"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Blocked URL host/);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("rejects loopback via allowlist", async () => {
    const res = await GET(requestWith("http://127.0.0.1/admin", "openrouter-free"));
    expect(res.status).toBe(400);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("rejects private-network range via allowlist", async () => {
    const res = await GET(requestWith("http://10.0.0.1/secret", "openrouter-free"));
    expect(res.status).toBe(400);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("rejects localhost via allowlist", async () => {
    const res = await GET(requestWith("http://localhost:8080/internal", "openrouter-free"));
    expect(res.status).toBe(400);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("allows openrouter.ai through the allowlist", async () => {
    mocks.fetchPublic.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "test", pricing: { prompt: "0", completion: "0" }, context_length: 200000 }] }), { status: 200 })
    );
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    expect(res.status).toBe(200);
    expect(mocks.fetchPublic).toHaveBeenCalledOnce();
  });

  it("allows api.openrouter.ai through the allowlist", async () => {
    mocks.fetchPublic.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const res = await GET(requestWith("https://api.openrouter.ai/models", "openrouter-free"));
    expect(res.status).toBe(200);
    expect(mocks.fetchPublic).toHaveBeenCalledOnce();
  });
});

describe("suggested-models scheme and credentials checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(null);
  });

  it("rejects file scheme", async () => {
    const res = await GET(requestWith("file:///etc/passwd", "openrouter-free"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/scheme/i);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });

  it("rejects URLs with embedded credentials", async () => {
    const res = await GET(requestWith("https://user:pass@openrouter.ai/models", "openrouter-free"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/credentials/i);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });
});

describe("suggested-models param validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(null);
  });

  it("requires url param", async () => {
    const res = await GET(requestWith(undefined, "opencode-free"));
    expect(res.status).toBe(400);
  });

  it("requires type param", async () => {
    const res = await GET(requestWith("https://openrouter.ai/models", undefined));
    expect(res.status).toBe(400);
  });

  it("rejects unknown filter type", async () => {
    const res = await GET(requestWith("https://openrouter.ai/models", "bogus-type"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Unknown filter/);
    expect(mocks.fetchPublic).not.toHaveBeenCalled();
  });
});

describe("suggested-models fetchPublic integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(null);
  });

  it("passes AbortSignal.timeout to fetchPublic", async () => {
    mocks.fetchPublic.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    const args = mocks.fetchPublic.mock.calls[0];
    expect(args[1]?.signal).toBeDefined();
  });

  it("surfaces SSRF block as 400 with error message", async () => {
    mocks.fetchPublic.mockRejectedValue(new Error("Blocked URL: DNS resolved to private IP"));
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Blocked URL/);
  });

  it("returns empty data on non-security network errors", async () => {
    mocks.fetchPublic.mockRejectedValue(new Error("Connection refused"));
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns empty data on non-ok response", async () => {
    mocks.fetchPublic.mockResolvedValue(
      new Response("not found", { status: 404 })
    );
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("applies filter to returned catalog data", async () => {
    mocks.fetchPublic.mockResolvedValue(
      new Response(JSON.stringify({
        data: [
          { id: "free-model", pricing: { prompt: "0", completion: "0" }, context_length: 200000 },
          { id: "paid-model", pricing: { prompt: "0.001", completion: "0.001" }, context_length: 200000 },
          { id: "short-context", pricing: { prompt: "0", completion: "0" }, context_length: 4000 },
        ]
      }), { status: 200 })
    );
    const res = await GET(requestWith("https://openrouter.ai/api/v1/models", "openrouter-free"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("free-model");
  });
});
