// Tests for POST /api/analyze-error.
// Mocks the heavy deps (DB, credentials, chatCore) to verify route behavior:
// validation, missing detail, no credentials, successful analysis extraction.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRequestDetailById = vi.fn();
const mockGetSettings = vi.fn();
const mockGetModelInfo = vi.fn();
const mockGetProviderCredentials = vi.fn();
const mockHandleChatCore = vi.fn();

// Security gate (2026-10-29): route now requires requireAuth. Mock it to
// always pass so the tests below exercise the business logic, not the auth
// gate. The auth gate itself is covered by credential-mutation-requireauth.test.js.
vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: async () => true,
}));

vi.mock("@/lib/db/repos/requestDetailsRepo.js", () => ({
  getRequestDetailById: (...a) => mockGetRequestDetailById(...a),
}));
vi.mock("@/lib/db/repos/settingsRepo.js", () => ({
  getSettings: (...a) => mockGetSettings(...a),
}));
vi.mock("@/sse/services/model.js", () => ({
  getModelInfo: (...a) => mockGetModelInfo(...a),
}));
vi.mock("@/sse/services/auth.js", () => ({
  getProviderCredentials: (...a) => mockGetProviderCredentials(...a),
}));
vi.mock("open-sse/handlers/chatCore.js", () => ({
  handleChatCore: (...a) => mockHandleChatCore(...a),
}));

async function callRoute(body) {
  const { POST } = await import("@/app/api/analyze-error/route.js");
  const req = new Request("http://localhost/api/analyze-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

function fakeChatCoreResponse(content) {
  return {
    response: {
      json: async () => ({ choices: [{ message: { content } }] }),
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  mockGetRequestDetailById.mockReset();
  mockGetSettings.mockReset();
  mockGetModelInfo.mockReset();
  mockGetProviderCredentials.mockReset();
  mockHandleChatCore.mockReset();
  mockGetSettings.mockResolvedValue({ analyzeErrorModel: "oc/mimo-v2.5-free" });
});

describe("POST /api/analyze-error", () => {
  it("rejects missing detailId with 400", async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("detailId");
  });

  it("returns 404 when detail not found", async () => {
    mockGetRequestDetailById.mockResolvedValue(null);
    const res = await callRoute({ detailId: "nope" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("returns 400 when analysis model provider has no credentials", async () => {
    mockGetRequestDetailById.mockResolvedValue({
      id: "d1", provider: "openai", model: "gpt-4o", status: "error",
      response: { error: "rate limited" },
    });
    mockGetModelInfo.mockResolvedValue({ provider: "oc", model: "mimo-v2.5-free" });
    mockGetProviderCredentials.mockResolvedValue(null);

    const res = await callRoute({ detailId: "d1" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No active credentials");
    // chatCore must never be called without credentials
    expect(mockHandleChatCore).not.toHaveBeenCalled();
  });

  it("returns analysis text + model on success", async () => {
    mockGetRequestDetailById.mockResolvedValue({
      id: "d1", provider: "openai", model: "gpt-4o", status: "error",
      response: { error: "rate limited" },
      request: { model: "gpt-4o", messages: [{ role: "user", content: "hi" }] },
    });
    mockGetModelInfo.mockResolvedValue({ provider: "oc", model: "mimo-v2.5-free" });
    mockGetProviderCredentials.mockResolvedValue({ id: "noauth", connectionId: "c1", accessToken: "public" });
    mockHandleChatCore.mockResolvedValue(
      fakeChatCoreResponse("- likely cause: 429 rate limit\n- transient: yes")
    );

    const res = await callRoute({ detailId: "d1" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toContain("rate limit");
    expect(body.model).toBe("oc/mimo-v2.5-free");

    // Real assertion: chatCore received the diagnostic prompt containing the error context
    const [chatCoreArgs] = mockHandleChatCore.mock.calls[0];
    const userMsg = chatCoreArgs.body.messages.find((m) => m.role === "user");
    expect(userMsg.content).toContain("rate limited");
    expect(userMsg.content).toContain("openai");
  });
});
