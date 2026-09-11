import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  json: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
  })),
  createProviderConnection: vi.fn(),
  fetchImpl: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.json },
}));

vi.mock("@/models", () => ({
  createProviderConnection: mocks.createProviderConnection,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({ get: vi.fn() })),
}));

// Override global fetch with our mock
vi.stubGlobal("fetch", mocks.fetchImpl);

const { POST } = await import(
  "../../../src/app/api/oauth/gitlab/pat/route.js"
);

function makeRequest(body) {
  return {
    json: () => Promise.resolve(body),
  };
}

describe("POST /api/oauth/gitlab/pat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const req = { json: () => Promise.reject(new SyntaxError()) };
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ token: "" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Personal Access Token is required");
  });

  it("returns 401 when token verification fails", async () => {
    mocks.fetchImpl.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Invalid token"),
    });
    const res = await POST(makeRequest({ token: "bad-token" }));
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("verification failed");
  });

  it("returns 200 and stores connection on valid token", async () => {
    mocks.fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
        }),
    });
    const res = await POST(makeRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    expect(mocks.createProviderConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gitlab",
        accessToken: "valid-token",
        email: "user@example.com",
      })
    );
  });

  it("passes AbortSignal.timeout(10000) to fetch", async () => {
    mocks.fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: "a@b.com" }),
    });
    await POST(makeRequest({ token: "tok" }));
    const [, opts] = mocks.fetchImpl.mock.calls[0];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 504 when fetch aborts due to timeout", async () => {
    const timeoutError = new DOMException(
      "The operation was aborted.",
      "AbortError"
    );
    mocks.fetchImpl.mockRejectedValueOnce(timeoutError);
    const res = await POST(makeRequest({ token: "tok" }));
    expect(res.status).toBe(504);
    expect(res.body.error).toContain("timeout");
  });

  it("uses default gitlab.com when baseUrl is omitted", async () => {
    mocks.fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: "u@g.com" }),
    });
    await POST(makeRequest({ token: "tok" }));
    expect(mocks.fetchImpl.mock.calls[0][0]).toContain(
      "https://gitlab.com/api/v4/user"
    );
  });

  it("uses custom baseUrl when provided", async () => {
    mocks.fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: "u@h.com" }),
    });
    await POST(
      makeRequest({
        token: "tok",
        baseUrl: "https://gitlab.mycompany.com/",
      })
    );
    expect(mocks.fetchImpl.mock.calls[0][0]).toContain(
      "https://gitlab.mycompany.com/api/v4/user"
    );
  });
});
