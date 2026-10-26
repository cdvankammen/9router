/**
 * Negative 401 coverage for every route-level requireAuth gate added by
 * the Finding #7 hardening pass (commits 1ebed4fc, 27ff0cfa, f7a641d3).
 *
 * WHY THIS FILE EXISTS:
 *   An independent adversarial review (2026-10-26) flagged that the
 *   positive-path tests mock requireAuth to `true`, so a future regression
 *   that deletes `if (!(await requireAuth(request)))` from any handler
 *   would still pass green. This file covers the *negative* path — when
 *   requireAuth returns false, every newly gated handler must return 401
 *   with `{ error: "Unauthorized" }` and MUST NOT invoke any DB write or
 *   outbound call.
 *
 * STRATEGY:
 *   - Mock requireAuth → false (covers both JWT and CLI token paths).
 *   - Mock every DB/network dependency the handler touches to a throwing
 *     sentinel. If the handler fires past the gate, the sentinel throws
 *     and the test fails — proving the gate is *enforced*, not just
 *     present.
 *   - For each gated verb, assert: status === 401, body.error === "Unauthorized",
 *     and zero sentinel invocations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Sentinel: any DB/network call past the gate throws so the test fails loudly.
const GATE_BYPASSED = new Error("GATE BYPASSED — handler ran past requireAuth");

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: async () => false,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status || 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
}));

// Shared sentinel mocks — installed per test where relevant.
const sentinelMocks = () => ({
  getProviderConnectionById: vi.fn(() => { throw GATE_BYPASSED; }),
  updateProviderConnection: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteProviderConnection: vi.fn(() => { throw GATE_BYPASSED; }),
  getProviderNodeById: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteProviderNode: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteProviderConnectionsByProvider: vi.fn(() => { throw GATE_BYPASSED; }),
  updateProviderNode: vi.fn(() => { throw GATE_BYPASSED; }),
  getComboById: vi.fn(() => { throw GATE_BYPASSED; }),
  updateCombo: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteCombo: vi.fn(() => { throw GATE_BYPASSED; }),
  getComboByName: vi.fn(() => { throw GATE_BYPASSED; }),
  getProxyPoolById: vi.fn(() => { throw GATE_BYPASSED; }),
  updateProxyPool: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteProxyPool: vi.fn(() => { throw GATE_BYPASSED; }),
  getProviderConnections: vi.fn(() => { throw GATE_BYPASSED; }),
  getRequestDetailById: vi.fn(() => { throw GATE_BYPASSED; }),
  getAnnotations: vi.fn(() => { throw GATE_BYPASSED; }),
  addAnnotation: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteAnnotation: vi.fn(() => { throw GATE_BYPASSED; }),
  toggleStar: vi.fn(() => { throw GATE_BYPASSED; }),
  getSettings: vi.fn(() => { throw GATE_BYPASSED; }),
  updateSettings: vi.fn(() => { throw GATE_BYPASSED; }),
  getApiKeyById: vi.fn(() => { throw GATE_BYPASSED; }),
  updateApiKey: vi.fn(() => { throw GATE_BYPASSED; }),
  deleteApiKey: vi.fn(() => { throw GATE_BYPASSED; }),
});

function makeRequest(method = "GET", body = null, headers = {}) {
  const init = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body !== null) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/placeholder", init);
}

const params = (id = "fake-uuid") => ({ params: Promise.resolve({ id }) });

async function expectUnauthorized(response, sentinels = []) {
  expect(response.status).toBe(401);
  const body = await response.json();
  expect(body.error).toBe("Unauthorized");
  for (const s of sentinels) {
    expect(s).not.toHaveBeenCalled();
  }
}

describe("requireAuth negative coverage (Finding #7 hardening)", () => {
  let mocks;

  beforeEach(() => {
    vi.resetModules();
    mocks = sentinelMocks();
  });

  afterEach(() => {
    vi.doUnmock("next/server");
    vi.doUnmock("@/lib/auth/requireAuth");
    vi.resetModules();
  });

  // ── providers/[id] PUT ────────────────────────────────────────────
  it("PUT /api/providers/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/models", () => ({
      getProviderConnectionById: mocks.getProviderConnectionById,
      updateProviderConnection: mocks.updateProviderConnection,
    }));
    const { PUT } = await import("@/app/api/providers/[id]/route.js");
    const res = await PUT(
      makeRequest("PUT", { name: "evil" }),
      params("conn-1"),
    );
    await expectUnauthorized(res, [
      mocks.getProviderConnectionById,
      mocks.updateProviderConnection,
    ]);
  });

  // ── providers/[id] DELETE ─────────────────────────────────────────
  it("DELETE /api/providers/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/models", () => ({
      deleteProviderConnection: mocks.deleteProviderConnection,
    }));
    const { DELETE } = await import("@/app/api/providers/[id]/route.js");
    const res = await DELETE(makeRequest("DELETE"), params("conn-1"));
    await expectUnauthorized(res, [mocks.deleteProviderConnection]);
  });

  // ── provider-nodes/[id] PUT ───────────────────────────────────────
  it("PUT /api/provider-nodes/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/models", () => ({
      getProviderNodeById: mocks.getProviderNodeById,
      updateProviderNode: mocks.updateProviderNode,
      getProviderConnections: mocks.getProviderConnections,
      updateProviderConnection: mocks.updateProviderConnection,
    }));
    const { PUT } = await import("@/app/api/provider-nodes/[id]/route.js");
    const res = await PUT(
      makeRequest("PUT", { name: "x", prefix: "x", apiType: "chat" }),
      params("node-1"),
    );
    await expectUnauthorized(res, [
      mocks.getProviderNodeById,
      mocks.updateProviderNode,
    ]);
  });

  // ── provider-nodes/[id] DELETE (CRITICAL cascading delete) ────────
  it("DELETE /api/provider-nodes/[id] returns 401 without cascading", async () => {
    vi.doMock("@/models", () => ({
      getProviderNodeById: mocks.getProviderNodeById,
      deleteProviderNode: mocks.deleteProviderNode,
      deleteProviderConnectionsByProvider: mocks.deleteProviderConnectionsByProvider,
    }));
    const { DELETE } = await import("@/app/api/provider-nodes/[id]/route.js");
    const res = await DELETE(makeRequest("DELETE"), params("node-1"));
    await expectUnauthorized(res, [
      mocks.deleteProviderConnectionsByProvider,
      mocks.deleteProviderNode,
    ]);
  });

  // ── combos/[id] PUT ───────────────────────────────────────────────
  it("PUT /api/combos/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/lib/localDb", () => ({
      getComboById: mocks.getComboById,
      updateCombo: mocks.updateCombo,
      getComboByName: mocks.getComboByName,
    }));
    vi.doMock("open-sse/services/combo.js", () => ({
      resetComboRotation: vi.fn(() => { throw GATE_BYPASSED; }),
    }));
    const { PUT } = await import("@/app/api/combos/[id]/route.js");
    const res = await PUT(
      makeRequest("PUT", { name: "evil-combo" }),
      params("combo-1"),
    );
    await expectUnauthorized(res, [mocks.getComboById, mocks.updateCombo]);
  });

  // ── combos/[id] DELETE ────────────────────────────────────────────
  it("DELETE /api/combos/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/lib/localDb", () => ({
      getComboById: mocks.getComboById,
      deleteCombo: mocks.deleteCombo,
    }));
    vi.doMock("open-sse/services/combo.js", () => ({
      resetComboRotation: vi.fn(() => { throw GATE_BYPASSED; }),
    }));
    const { DELETE } = await import("@/app/api/combos/[id]/route.js");
    const res = await DELETE(makeRequest("DELETE"), params("combo-1"));
    await expectUnauthorized(res, [mocks.deleteCombo]);
  });

  // ── proxy-pools/[id] PUT ──────────────────────────────────────────
  it("PUT /api/proxy-pools/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/models", () => ({
      getProxyPoolById: mocks.getProxyPoolById,
      updateProxyPool: mocks.updateProxyPool,
    }));
    const { PUT } = await import("@/app/api/proxy-pools/[id]/route.js");
    const res = await PUT(
      makeRequest("PUT", { name: "evil-pool", proxyUrl: "http://evil" }),
      params("pool-1"),
    );
    await expectUnauthorized(res, [mocks.getProxyPoolById, mocks.updateProxyPool]);
  });

  // ── proxy-pools/[id] DELETE ───────────────────────────────────────
  it("DELETE /api/proxy-pools/[id] returns 401 without touching DB", async () => {
    vi.doMock("@/models", () => ({
      getProxyPoolById: mocks.getProxyPoolById,
      deleteProxyPool: mocks.deleteProxyPool,
      getProviderConnections: mocks.getProviderConnections,
    }));
    const { DELETE } = await import("@/app/api/proxy-pools/[id]/route.js");
    const res = await DELETE(makeRequest("DELETE"), params("pool-1"));
    await expectUnauthorized(res, [mocks.getProxyPoolById, mocks.deleteProxyPool]);
  });

  // ── hooks POST (outbound exfiltration primitive) ──────────────────
  it("POST /api/hooks returns 401 without reading message or fetching URL", async () => {
    vi.doMock("@/lib/usageDb", () => ({
      getRequestDetailById: mocks.getRequestDetailById,
    }));
    vi.doMock("@/shared/hookTemplate", () => ({
      buildHookContext: vi.fn(() => { throw GATE_BYPASSED; }),
      expandTemplate: vi.fn(() => { throw GATE_BYPASSED; }),
      extractText: vi.fn(() => { throw GATE_BYPASSED; }),
    }));
    const { POST } = await import("@/app/api/hooks/route.js");
    const res = await POST(
      makeRequest("POST", { messageId: "m1", url: "http://evil.test/steal" }),
    );
    await expectUnauthorized(res, [mocks.getRequestDetailById]);
  });

  // ── test-batch POST (fleet-wide SSRF-via-stored-config) ───────────
  it("POST /api/providers/test-batch returns 401 without listing connections", async () => {
    vi.doMock("@/models", () => ({
      getProviderConnections: mocks.getProviderConnections,
    }));
    const { POST } = await import("@/app/api/providers/test-batch/route.js");
    const res = await POST(makeRequest("POST", { mode: "free" }));
    await expectUnauthorized(res, [mocks.getProviderConnections]);
  });

  // ── messages/[id]/annotations POST ────────────────────────────────
  it("POST /api/messages/[id]/annotations returns 401 without writing", async () => {
    vi.doMock("@/lib/usageDb", () => ({
      getRequestDetailById: mocks.getRequestDetailById,
      addAnnotation: mocks.addAnnotation,
    }));
    const { POST } = await import("@/app/api/messages/[id]/annotations/route.js");
    const res = await POST(
      makeRequest("POST", { kind: "tag", value: "evil" }),
      params("msg-1"),
    );
    await expectUnauthorized(res, [mocks.addAnnotation]);
  });

  // ── messages/[id]/annotations DELETE ──────────────────────────────
  it("DELETE /api/messages/[id]/annotations returns 401 without deleting", async () => {
    vi.doMock("@/lib/usageDb", () => ({
      deleteAnnotation: mocks.deleteAnnotation,
    }));
    const { DELETE } = await import("@/app/api/messages/[id]/annotations/route.js");
    const req = new Request(
      "http://localhost/api/messages/msg-1/annotations?annotationId=42",
      { method: "DELETE", headers: { "Content-Type": "application/json" } },
    );
    const res = await DELETE(req, params("msg-1"));
    await expectUnauthorized(res, [mocks.deleteAnnotation]);
  });

  // ── messages/[id]/annotations PATCH (star toggle) ─────────────────
  it("PATCH /api/messages/[id]/annotations returns 401 without toggling", async () => {
    vi.doMock("@/lib/usageDb", () => ({
      getRequestDetailById: mocks.getRequestDetailById,
      toggleStar: mocks.toggleStar,
    }));
    const { PATCH } = await import("@/app/api/messages/[id]/annotations/route.js");
    const res = await PATCH(makeRequest("PATCH", {}), params("msg-1"));
    await expectUnauthorized(res, [mocks.toggleStar]);
  });

  // ── messages/[id]/actions POST (replay / send-to-webhook) ─────────
  it("POST /api/messages/[id]/actions returns 401 without reading message", async () => {
    vi.doMock("@/lib/usageDb", () => ({
      getRequestDetailById: mocks.getRequestDetailById,
      addAnnotation: mocks.addAnnotation,
      deleteAnnotation: mocks.deleteAnnotation,
    }));
    vi.doMock("@/sse/handlers/chat.js", () => ({
      handleChat: vi.fn(() => { throw GATE_BYPASSED; }),
    }));
    vi.doMock("open-sse/translator/index.js", () => ({
      initTranslators: vi.fn(),
    }));
    vi.doMock("@/shared/hookTemplate", () => ({
      extractText: vi.fn(() => { throw GATE_BYPASSED; }),
    }));
    const { POST } = await import("@/app/api/messages/[id]/actions/route.js");
    const res = await POST(
      makeRequest("POST", { action: "replay" }),
      params("msg-1"),
    );
    await expectUnauthorized(res, [mocks.getRequestDetailById]);
  });

  // ── providers/[id]/overrides PUT (writes global settings) ─────────
  it("PUT /api/providers/[id]/overrides returns 401 without writing settings", async () => {
    vi.doMock("@/lib/localDb", () => ({
      getSettings: mocks.getSettings,
      updateSettings: mocks.updateSettings,
    }));
    vi.doMock("open-sse/config/providers.js", () => ({
      PROVIDERS: {},
    }));
    vi.doMock("open-sse/services/model.js", () => ({
      resolveProviderAlias: (x) => x,
    }));
    const { PUT } = await import("@/app/api/providers/[id]/overrides/route.js");
    const res = await PUT(
      makeRequest("PUT", { headers: { "x-evil": "true" } }),
      params("openai"),
    );
    await expectUnauthorized(res, [mocks.getSettings, mocks.updateSettings]);
  });
});
