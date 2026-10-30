// Security hardening test for finding #337: translator /translate step 3
// returns credential-bearing headers (Authorization: Bearer sk-...,
// x-api-key: sk-ant-...) to the authenticated dashboard client. An
// authenticated user could iterate every configured provider and dump
// every stored API key, OAuth access token, and copilot token.
//
// The fix: redactSensitiveHeaders() masks credential values before they
// cross the wire. The /send route rebuilds credentials from the DB
// server-side, so it never depends on these headers — they are for
// human debugging only.
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("open-sse/services/provider.js", () => ({
  detectFormat: vi.fn(() => "openai"),
  getTargetFormat: vi.fn(() => "openai"),
}));
vi.mock("open-sse/translator/index.js", () => ({
  translateRequest: vi.fn(() => ({ model: "gpt-4", messages: [] })),
}));
vi.mock("open-sse/translator/formats.js", () => ({
  FORMATS: { OPENAI: "openai" },
}));
vi.mock("@/sse/services/model.js", () => ({
  getModelInfo: vi.fn(async (m) => ({ provider: "openai", model: m })),
}));
vi.mock("@/lib/localDb.js", () => ({
  getProviderConnections: vi.fn(async () => [{
    id: "conn-1",
    isActive: true,
    apiKey: "sk-secret-provider-key-do-not-leak",
    accessToken: "oauth-access-token-do-not-leak",
    refreshToken: "oauth-refresh-token-do-not-leak",
    copilotToken: "copilot-token-do-not-leak",
    projectId: null,
    providerSpecificData: {},
  }]),
}));

// Mock executor that returns obviously-leakable headers so we can prove
// the redaction fires. buildUrl/buildHeaders/transformRequest are called
// by step 3 in that order.
const mockBuildHeaders = vi.fn(() => ({
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-secret-provider-key-do-not-leak",
  "x-api-key": "sk-ant-api03-anthropic-secret-DO-NOT-LEAK",
  "Cookie": "session=abc123",
}));
const mockBuildUrl = vi.fn(() => "https://api.openai.com/v1/chat/completions");
const mockTransformRequest = vi.fn((_m, body) => body);
vi.mock("open-sse/executors/index.js", () => ({
  getExecutor: vi.fn(() => ({
    buildHeaders: mockBuildHeaders,
    buildUrl: mockBuildUrl,
    transformRequest: mockTransformRequest,
  })),
}));

let POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/translator/translate/route.js"));
});

describe("Finding #337: translator step 3 redacts credential headers", () => {
  it("Authorization header is masked — full secret does not cross the wire", async () => {
    const req = new Request("http://localhost/api/translator/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 3,
        body: {
          provider: "openai",
          model: "gpt-4",
          body: { messages: [{ role: "user", content: "hi" }] },
        },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const headers = json.result.headers;
    // The full secret MUST NOT appear anywhere in the response.
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("sk-secret-provider-key-do-not-leak");
    expect(serialized).not.toContain("sk-ant-api03-anthropic-secret-DO-NOT-LEAK");
    expect(serialized).not.toContain("oauth-access-token-do-not-leak");

    // The masked value must still be present and recognizable (not empty).
    expect(headers.Authorization).toMatch(/redacted/i);
    expect(headers["x-api-key"]).toMatch(/redacted/i);
  });

  it("non-sensitive headers pass through unchanged", async () => {
    const req = new Request("http://localhost/api/translator/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 3,
        body: {
          provider: "openai",
          model: "gpt-4",
          body: { messages: [] },
        },
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    // Content-Type is not a sensitive header — must pass through.
    expect(json.result.headers["Content-Type"]).toBe("application/json");
  });

  it("URL and body are returned unmodified (only headers are redacted)", async () => {
    const req = new Request("http://localhost/api/translator/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 3,
        body: {
          provider: "openai",
          model: "gpt-4",
          body: { messages: [] },
        },
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    // URL must be the real upstream URL — the client uses it for debugging.
    expect(json.result.url).toBe("https://api.openai.com/v1/chat/completions");
    // Body must be present and not redacted (body doesn't contain secrets here).
    expect(json.result.body).toBeDefined();
  });

  it("source-level: route defines REDACT_HEADER_PATTERNS and applies redactSensitiveHeaders", () => {
    const fs = require("node:fs");
    const src = fs.readFileSync(
      require("node:path").join(__dirname, "../../src/app/api/translator/translate/route.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#337/);
    expect(src).toMatch(/REDACT_HEADER_PATTERNS/);
    expect(src).toMatch(/function\s+redactSensitiveHeaders/);
    // The step-3 response must pipe headers through redactSensitiveHeaders.
    expect(src).toMatch(/headers\s*:\s*redactSensitiveHeaders\s*\(\s*headers\s*\)/);
  });
});
