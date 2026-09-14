/**
 * SSRF guard on GET /api/providers/suggested-models (#3782).
 *
 * The route accepts a ?url= param and fetches it server-side. Without
 * SSRF protection an attacker could probe internal/metadata endpoints:
 *   ?url=http://169.254.169.254/latest/meta-data/
 *
 * This test verifies assertPublicUrlResolved is applied before the fetch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  "../../../src/app/api/providers/suggested-models/route.js"
);

function requestWith(url, type = "opencode-free") {
  const base = "http://gateway.example.com/api/providers/suggested-models";
  return new Request(`${base}?url=${encodeURIComponent(url)}&type=${type}`);
}

describe("suggested-models SSRF guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects cloud metadata URL without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await GET(
      requestWith("http://169.254.169.254/latest/meta-data/")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/internal|blocked/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects loopback URL without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await GET(requestWith("http://127.0.0.1/admin"));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects IPv6 loopback without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await GET(requestWith("http://[::1]/"));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects private-network range without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await GET(requestWith("http://10.0.0.1/secret"));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still requires url and type params", async () => {
    const res = await GET(
      new Request(
        "http://gateway.example.com/api/providers/suggested-models?type=opencode-free"
      )
    );
    expect(res.status).toBe(400);
  });

  it("allows public URLs to pass through to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      )
    );
    // Use a public hostname that resolves (api.openai.com) — guard will
    // attempt DNS lookup. Mock the DNS to return public.
    const dns = await import("node:dns");
    const originalLookup = dns.default?.promises?.lookup || dns.promises?.lookup;
    // Stub via global mock if available, otherwise skip this assertion's DNS path
    const res = await GET(
      requestWith("https://8.8.8.8/models")
    );
    // 8.8.8.8 is a public IP — literal check passes immediately, DNS never called.
    // fetch is mocked to return []
    expect(res.status).toBe(200);
  });
});
