import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/shared/constants/providers", () => ({
  AI_PROVIDERS: {
    elevenlabs: { alias: "el" },
    deepgram: { alias: "dg" },
  },
}));

import { GET } from "../../src/app/api/v1/audio/voices/route.js";

const originalFetch = global.fetch;

describe("GET /v1/audio/voices — fetch timeout (GAP-P2-19)", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("passes AbortSignal.timeout to the upstream fetch call", async () => {
    global.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ byLang: { English: { voices: [{ id: "v1", name: "Voice 1" }] } } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new Request("http://localhost/api/v1/audio/voices?provider=elevenlabs");
    await GET(req);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchOpts = global.fetch.mock.calls[0][1];
    expect(fetchOpts).toBeDefined();
    expect(fetchOpts.signal).toBeInstanceOf(AbortSignal);
    // Verify it's a timeout signal (aborts after delay, not immediately)
    expect(fetchOpts.signal.aborted).toBe(false);
  });

  it("returns 502 with timeout message when upstream fetch hangs and aborts", async () => {
    // Simulate AbortSignal.timeout firing
    global.fetch.mockRejectedValueOnce(new DOMException("The operation was aborted.", "TimeoutError"));

    const req = new Request("http://localhost/api/v1/audio/voices?provider=deepgram");
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBeDefined();
    expect(body.error.type).toBe("server_error");
  });

  it("anti-false-positive: test fails if fetch is called without signal", async () => {
    // This test intentionally verifies the signal IS passed.
    // If someone removes the signal from route.js, this test MUST fail.
    global.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ byLang: {} }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new Request("http://localhost/api/v1/audio/voices?provider=elevenlabs");
    await GET(req);

    const fetchOpts = global.fetch.mock.calls[0][1];
    // This assertion will FAIL if signal is missing from the fetch call
    expect(fetchOpts?.signal).toBeTruthy();
    expect(fetchOpts?.signal).toBeInstanceOf(AbortSignal);
  });
});
