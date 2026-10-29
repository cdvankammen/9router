/**
 * Regression (2026-10-29): GET and POST /api/keys were missing route-level
 * requireAuth gates. Even though key VALUES are masked server-side, the
 * list endpoint leaked every key's UUID, name, access scope, timestamps,
 * and last-used metadata to unauthenticated LAN peers on requireLogin=false
 * deployments — useful for targeted IDOR probes against the [id] routes.
 * POST was also ungated, allowing unauthenticated peers to mint gateway
 * credentials.
 *
 * The [id] route already had requireAuth on GET/PUT/DELETE (from the IDOR
 * sweep), so this closes the last gap in the keys surface.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getApiKeys: vi.fn(async () => [
    { id: "k1", name: "test", key: "sk-1234567890abcdef", isActive: true },
  ]),
  createApiKey: vi.fn(async (name, machineId) => ({
    id: "new-id",
    name,
    key: "sk-new-key-value-here",
    machineId,
  })),
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: vi.fn(async () => "test-machine-id"),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({ body, status: init?.status ?? 200, _json: true }),
  },
}));

import { requireAuth } from "@/lib/auth/requireAuth";
import { GET, POST } from "@/app/api/keys/route.js";

describe("/api/keys route-level requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeRequest = () => ({ headers: new Map() });

  it("GET returns 401 when requireAuth is false", async () => {
    requireAuth.mockResolvedValue(false);
    const res = await GET(fakeRequest());
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("GET returns masked keys when requireAuth is true", async () => {
    requireAuth.mockResolvedValue(true);
    const res = await GET(fakeRequest());
    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    // Key must be masked — not the raw value
    expect(res.body.keys[0].key).not.toBe("sk-1234567890abcdef");
    expect(res.body.keys[0].key).toContain("\u2022");
  });

  it("POST returns 401 when requireAuth is false", async () => {
    requireAuth.mockResolvedValue(false);
    const req = {
      json: async () => ({ name: "new-key" }),
      headers: new Map(),
    };
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("POST creates a key when requireAuth is true", async () => {
    requireAuth.mockResolvedValue(true);
    const req = {
      json: async () => ({ name: "new-key" }),
      headers: new Map(),
    };
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("new-key");
    expect(res.body.key).toBeTruthy();
  });

  it("POST returns 400 when name is missing (after auth passes)", async () => {
    requireAuth.mockResolvedValue(true);
    const req = {
      json: async () => ({}),
      headers: new Map(),
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name is required");
  });
});
