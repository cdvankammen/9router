/**
 * Regression (2026-10-29): DELETE /api/provider-nodes/[id] cascades to
 * every connection bound to the node via deleteProviderConnectionsByProvider(id).
 * An authenticated admin could trigger this accidentally; a future dashboard
 * refactor that loses the confirm() dialog would trigger it silently.
 *
 * Defence-in-depth layer 2 (on top of requireAuth):
 *   - Server requires `X-Confirm-Cascade: true` header
 *   - Missing or wrong value → 412 Precondition Failed with a hint
 *   - No DB writes occur on 412 (neither deleteProviderConnectionsByProvider
 *     nor deleteProviderNode runs)
 *
 * The dashboard callers (providers/[id]/page.js, media-providers/[kind]/[id]/page.js)
 * and the CLI client (cli/src/cli/api/client.js#deleteProviderNode) were updated
 * to send the header.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// Sentinel: any DB call past the cascade gate throws so a bypass fails loudly.
const CASCADE_BYPASSED = new Error("CASCADE BYPASSED — delete ran without confirmation");

// Auth layer always passes — we're testing the confirmation layer on top.
vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: async () => true,
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

function makeRequest(headers = {}) {
  return new Request("http://localhost/api/provider-nodes/node-1", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const params = (id = "node-1") => ({ params: Promise.resolve({ id }) });

/**
 * Register a fresh set of @/models mocks and return the DELETE handler
 * from a fresh module import. Each test gets an isolated module graph
 * so vi.doMock changes don't leak across tests.
 */
async function loadRouteWithMocks(modelsMocks) {
  vi.doMock("@/models", () => modelsMocks);
  vi.resetModules();
  const mod = await import("@/app/api/provider-nodes/[id]/route.js");
  return mod.DELETE;
}

afterEach(() => {
  vi.doUnmock("@/models");
  vi.resetModules();
});

describe("DELETE /api/provider-nodes/[id] — cascade confirmation gate", () => {
  it("rejects with 412 when X-Confirm-Cascade header is missing", async () => {
    const deleteNode = vi.fn(() => { throw CASCADE_BYPASSED; });
    const deleteConns = vi.fn(() => { throw CASCADE_BYPASSED; });
    const DELETE = await loadRouteWithMocks({
      getProviderNodeById: vi.fn(() => { throw CASCADE_BYPASSED; }),
      deleteProviderNode: deleteNode,
      deleteProviderConnectionsByProvider: deleteConns,
    });

    const res = await DELETE(makeRequest(), params("node-1"));

    expect(res.status).toBe(412);
    const body = await res.json();
    expect(body.error).toMatch(/cascade/i);
    expect(body.hint).toBeDefined();
    // Critical: neither cascade function must have run
    expect(deleteConns).not.toHaveBeenCalled();
    expect(deleteNode).not.toHaveBeenCalled();
  });

  it("rejects with 412 when header is present but not 'true'", async () => {
    const deleteNode = vi.fn(() => { throw CASCADE_BYPASSED; });
    const deleteConns = vi.fn(() => { throw CASCADE_BYPASSED; });
    const DELETE = await loadRouteWithMocks({
      getProviderNodeById: vi.fn(() => { throw CASCADE_BYPASSED; }),
      deleteProviderNode: deleteNode,
      deleteProviderConnectionsByProvider: deleteConns,
    });

    const res = await DELETE(
      makeRequest({ "X-Confirm-Cascade": "yes" }),
      params("node-1"),
    );

    expect(res.status).toBe(412);
    expect(deleteConns).not.toHaveBeenCalled();
    expect(deleteNode).not.toHaveBeenCalled();
  });

  it("rejects with 412 when header is case-mismatched ('True' vs 'true')", async () => {
    const deleteNode = vi.fn(() => { throw CASCADE_BYPASSED; });
    const deleteConns = vi.fn(() => { throw CASCADE_BYPASSED; });
    const DELETE = await loadRouteWithMocks({
      getProviderNodeById: vi.fn(() => { throw CASCADE_BYPASSED; }),
      deleteProviderNode: deleteNode,
      deleteProviderConnectionsByProvider: deleteConns,
    });

    const res = await DELETE(
      makeRequest({ "X-Confirm-Cascade": "True" }),
      params("node-1"),
    );

    expect(res.status).toBe(412);
    expect(deleteConns).not.toHaveBeenCalled();
    expect(deleteNode).not.toHaveBeenCalled();
  });

  it("proceeds to cascade when X-Confirm-Cascade: true is set", async () => {
    const deleteConns = vi.fn(async () => undefined);
    const deleteNode = vi.fn(async () => undefined);
    const DELETE = await loadRouteWithMocks({
      getProviderNodeById: vi.fn(async () => ({ id: "node-1", name: "test-node" })),
      deleteProviderNode: deleteNode,
      deleteProviderConnectionsByProvider: deleteConns,
    });

    const res = await DELETE(
      makeRequest({ "X-Confirm-Cascade": "true" }),
      params("node-1"),
    );

    expect(res.status).toBe(200);
    // Cascade order matters: connections first, then the node itself
    expect(deleteConns).toHaveBeenCalledWith("node-1");
    expect(deleteNode).toHaveBeenCalledWith("node-1");
    expect(deleteConns.mock.invocationCallOrder[0]).toBeLessThan(
      deleteNode.mock.invocationCallOrder[0],
    );
  });

  it("returns 404 when node doesn't exist (after passing both gates)", async () => {
    const deleteConns = vi.fn(async () => undefined);
    const deleteNode = vi.fn(async () => undefined);
    const DELETE = await loadRouteWithMocks({
      getProviderNodeById: vi.fn(async () => null),
      deleteProviderNode: deleteNode,
      deleteProviderConnectionsByProvider: deleteConns,
    });

    const res = await DELETE(
      makeRequest({ "X-Confirm-Cascade": "true" }),
      params("missing-node"),
    );

    expect(res.status).toBe(404);
    // Cascade must NOT have run on a missing node
    expect(deleteConns).not.toHaveBeenCalled();
    expect(deleteNode).not.toHaveBeenCalled();
  });
});
