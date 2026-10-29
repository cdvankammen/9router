/**
 * Regression (2026-10-29): three routes that use stored provider credentials
 * or write to the host filesystem had no route-level requireAuth gate.
 *
 * - POST /api/analyze-error — reads captured request details (prompts,
 *   provider responses, auth headers) from the request log and forwards them
 *   to a configured LLM provider using stored credentials. On open
 *   deployments, any LAN peer could force the server to spend tokens/credits
 *   AND exfiltrate stored request data to the LLM provider.
 *
 * - POST /api/claude-compat/write-claude-settings — writes directly to
 *   ~/.claude/settings.json on the host filesystem. An unauthenticated peer
 *   could inject environment variables (e.g., ANTHROPIC_BASE_URL pointing
 *   to an attacker server to capture the user's Anthropic tokens).
 *
 * - /api/headroom/restart and /api/headroom/extras — process-control routes
 *   that were NOT in LOCAL_ONLY_PATHS despite start/stop/proxy being there.
 *   extras runs pip install (arbitrary code execution via Python packages).
 *   Fix: added to LOCAL_ONLY_PATHS in dashboardGuard.js (middleware-level
 *   loopback restriction — no route-level test needed; the middleware
 *   classification is the gate).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db/repos/requestDetailsRepo.js", () => ({
  getRequestDetailById: vi.fn(async () => ({
    provider: "openai",
    model: "gpt-4",
    status: "error",
    response: { error: "test error" },
    request: { messages: [{ role: "user", content: "hi" }] },
    providerResponse: null,
  })),
}));

vi.mock("@/lib/db/repos/settingsRepo.js", () => ({
  getSettings: vi.fn(async () => ({ analyzeErrorModel: "openai/gpt-4" })),
}));

vi.mock("@/sse/services/model.js", () => ({
  getModelInfo: vi.fn(async () => ({ provider: "openai" })),
}));

vi.mock("@/sse/services/auth.js", () => ({
  getProviderCredentials: vi.fn(async () => ({ connectionId: "test" })),
}));

vi.mock("open-sse/handlers/chatCore.js", () => ({
  handleChatCore: vi.fn(async () => ({
    json: async () => ({
      choices: [{ message: { content: "mock analysis" } }],
    }),
  })),
}));

vi.mock("@/lib/localDb", () => ({
  updateSettings: vi.fn(async () => ({})),
}));

vi.mock("@/lib/claudeCompat", () => ({
  sanitizeDefaultModels: vi.fn((m) => m || {}),
  buildClaudeEnvOverrides: vi.fn(() => ({})),
  sanitizeEnvOverrides: vi.fn((e) => e || {}),
  mergeClaudeEnv: vi.fn(() => ({ env: { TEST_KEY: "value" } })),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(async () => "{}"),
    writeFile: vi.fn(async () => {}),
    mkdir: vi.fn(async () => {}),
  },
  readFile: vi.fn(async () => "{}"),
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({ body, status: init?.status ?? 200, _json: true }),
  },
}));

import { requireAuth } from "@/lib/auth/requireAuth";

describe("credential-using / filesystem-writing routes — requireAuth gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeRequest = (body = {}) => ({
    json: async () => body,
    headers: new Map(),
  });

  describe("POST /api/analyze-error", () => {
    it("returns 401 when requireAuth is false", async () => {
      requireAuth.mockResolvedValue(false);
      const { POST } = await import("@/app/api/analyze-error/route.js");
      const res = await POST(fakeRequest({ detailId: "test-id" }));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("proceeds to analysis when requireAuth is true", async () => {
      requireAuth.mockResolvedValue(true);
      const { POST } = await import("@/app/api/analyze-error/route.js");
      const res = await POST(fakeRequest({ detailId: "test-id" }));
      // Should reach the analysis path (200 with analysis field, or a
      // model-related error — either proves the gate passed)
      expect(res.status).not.toBe(401);
    });
  });

  describe("POST /api/claude-compat/write-claude-settings", () => {
    it("returns 401 when requireAuth is false", async () => {
      requireAuth.mockResolvedValue(false);
      const { POST } = await import(
        "@/app/api/claude-compat/write-claude-settings/route.js"
      );
      const res = await POST(fakeRequest({ env: { TEST: "value" } }));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("does not write to filesystem when requireAuth is false", async () => {
      requireAuth.mockResolvedValue(false);
      const fsMod = await import("node:fs/promises");
      const { POST } = await import(
        "@/app/api/claude-compat/write-claude-settings/route.js"
      );
      await POST(fakeRequest({ env: { TEST: "value" } }));
      expect(fsMod.writeFile).not.toHaveBeenCalled();
      expect(fsMod.default.writeFile).not.toHaveBeenCalled();
    });

    it("proceeds past the gate when requireAuth is true", async () => {
      requireAuth.mockResolvedValue(true);
      const { POST } = await import(
        "@/app/api/claude-compat/write-claude-settings/route.js"
      );
      const res = await POST(fakeRequest({ env: { TEST_KEY: "value" } }));
      // Should not return 401 — may return 400 (no env keys after sanitize)
      // or 200 (wrote successfully); either proves the gate passed
      expect(res.status).not.toBe(401);
    });
  });
});
