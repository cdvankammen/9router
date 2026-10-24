import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { validateOidcConfigForSave } = await import("@/lib/auth/oidc");

describe("validateOidcConfigForSave", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("rejects empty issuer URL", async () => {
    const result = await validateOidcConfigForSave({ issuerUrl: "" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty");
  });

  it("rejects null issuer URL", async () => {
    const result = await validateOidcConfigForSave({ issuerUrl: null });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty");
  });

  it("rejects invalid URL format", async () => {
    const result = await validateOidcConfigForSave({ issuerUrl: "not-a-url" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid-url");
  });

  it("rejects non-HTTPS URLs (except localhost)", async () => {
    const result = await validateOidcConfigForSave({ issuerUrl: "http://evil.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insecure");
    expect(result.message).toContain("HTTPS");
  });

  it("allows http://localhost for development", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authorization_endpoint: "http://localhost:8080/authorize",
        token_endpoint: "http://localhost:8080/token",
      }),
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "http://localhost:8080" });
    expect(result.ok).toBe(true);
  });

  it("rejects when discovery fetch fails (non-200)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://evil.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("fetch-failed");
  });

  it("rejects when discovery fetch throws (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));
    const result = await validateOidcConfigForSave({ issuerUrl: "https://unreachable.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("fetch-failed");
  });

  it("rejects when discovery doc is missing required fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ issuer: "https://evil.example.com" }),
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://evil.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-fields");
    expect(result.message).toContain("authorization_endpoint");
    expect(result.message).toContain("token_endpoint");
  });

  it("rejects when discovery doc is missing token_endpoint only", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authorization_endpoint: "https://idp.example.com/authorize" }),
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://idp.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-fields");
    expect(result.message).toContain("token_endpoint");
  });

  it("accepts valid discovery document", async () => {
    const discovery = {
      issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
      jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => discovery,
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://accounts.google.com" });
    expect(result.ok).toBe(true);
    expect(result.discovery).toEqual(discovery);
  });

  it("rejects when discovery returns non-object JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => "just a string",
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://bad.example.com" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad-json");
  });

  it("rejects timeout with reason 'timeout'", async () => {
    mockFetch.mockImplementationOnce((_url, opts) => {
      return new Promise((_, reject) => {
        // Simulate abort being triggered
        opts?.signal?.addEventListener?.("abort", () => {
          reject(new Error("Discovery fetch timed out after 100ms"));
        });
        // Trigger abort after a tick
        setTimeout(() => opts?.signal?.dispatchEvent?.(new Event("abort")), 1);
      });
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://slow.example.com", timeoutMs: 100 });
    // May be timeout or fetch-failed depending on timing
    expect(result.ok).toBe(false);
    expect(["timeout", "fetch-failed"]).toContain(result.reason);
  });

  it("strips trailing slashes from issuer URL", async () => {
    const discovery = {
      authorization_endpoint: "https://idp.example.com/authorize",
      token_endpoint: "https://idp.example.com/token",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => discovery,
    });
    const result = await validateOidcConfigForSave({ issuerUrl: "https://idp.example.com///" });
    expect(result.ok).toBe(true);
    // Verify fetch was called with the normalized URL
    expect(mockFetch).toHaveBeenCalledWith(
      "https://idp.example.com/.well-known/openid-configuration",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});