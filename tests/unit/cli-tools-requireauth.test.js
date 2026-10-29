/**
 * Negative 401 coverage for every /api/cli-tools/* route handler.
 *
 * WHY THIS EXISTS (OpenClaw audit 2026-10-29):
 *   The IDOR sweep (ea55c64c) gated providers/[id], combos/[id], etc.,
 *   but missed the entire cli-tools directory family. These routes
 *   read/write files in the user's home directory (~/.claude/,
 *   ~/.openclaw/, ~/.codex/, etc.) and return configured API keys in
 *   plaintext on GET. On requireLogin=false deployments (the documented
 *   default, confirmed active during Finding #6), any LAN peer could
 *   enumerate installed CLI tools and exfiltrate stored credentials.
 *
 * METHODOLOGY:
 *   - Mock requireAuth -> false (both JWT and CLI token paths).
 *   - Mock NextResponse.json, fs, child_process, @/lib/localDb,
 *     @/mitm/manager, @/models, and @/lib/mitmAliasCache so that if
 *     any handler fires past the gate, the sentinel throws and the
 *     test fails loudly rather than silently succeeding.
 *   - Table-driven: enumerate every route + exported method.
 *   - Assert: status === 401, body.error === "Unauthorized".
 *
 * INVENTORY (verified by .agent/audit-requireauth.sh on 2026-10-29):
 *   27 route files, 72 handler functions total.
 */
import { describe, it, expect, vi } from "vitest";

const GATE_BYPASSED = new Error("GATE BYPASSED - handler ran past requireAuth");

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

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: async () => { throw GATE_BYPASSED; },
    writeFile: async () => { throw GATE_BYPASSED; },
    mkdir: async () => { throw GATE_BYPASSED; },
    access: async () => { throw GATE_BYPASSED; },
    unlink: async () => { throw GATE_BYPASSED; },
    readdir: async () => { throw GATE_BYPASSED; },
    stat: async () => { throw GATE_BYPASSED; },
  },
}));

vi.mock("node:child_process", () => ({
  exec: () => { throw GATE_BYPASSED; },
  execFile: () => { throw GATE_BYPASSED; },
}));

vi.mock("node:util", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promisify: () => async () => { throw GATE_BYPASSED; },
  };
});

vi.mock("@/lib/localDb", () => ({
  getSettings: async () => { throw GATE_BYPASSED; },
  updateSettings: async () => { throw GATE_BYPASSED; },
  getProviderConnections: async () => { throw GATE_BYPASSED; },
}));

vi.mock("@/mitm/manager", () => ({
  getMitmStatus: async () => { throw GATE_BYPASSED; },
  startServer: async () => { throw GATE_BYPASSED; },
  stopServer: async () => { throw GATE_BYPASSED; },
  enableToolDNS: async () => { throw GATE_BYPASSED; },
  disableToolDNS: async () => { throw GATE_BYPASSED; },
  trustCert: async () => { throw GATE_BYPASSED; },
  getCachedPassword: async () => { throw GATE_BYPASSED; },
  setCachedPassword: async () => { throw GATE_BYPASSED; },
  loadEncryptedPassword: async () => { throw GATE_BYPASSED; },
  isSudoPasswordRequired: async () => { throw GATE_BYPASSED; },
  initDbHooks: () => {},
  getMitmAlias: async () => { throw GATE_BYPASSED; },
  setMitmAliasAll: async () => { throw GATE_BYPASSED; },
}));

vi.mock("@/models", () => ({
  getMitmAlias: async () => { throw GATE_BYPASSED; },
  setMitmAliasAll: async () => { throw GATE_BYPASSED; },
  default: async () => { throw GATE_BYPASSED; },
}));

vi.mock("@/lib/mitmAliasCache", () => ({
  writeAliasForTool: () => { throw GATE_BYPASSED; },
}));

vi.mock("confbox", () => ({
  parseTOML: () => { throw GATE_BYPASSED; },
  stringifyTOML: () => { throw GATE_BYPASSED; },
}));

// Hermes sibling import — must stub so hermes-settings/route.js can load.
vi.mock("@/app/api/cli-tools/hermes-settings/hermesProfiles.js", () => ({
  listProfiles: async () => { throw GATE_BYPASSED; },
  createProfile: async () => { throw GATE_BYPASSED; },
  deleteProfile: async () => { throw GATE_BYPASSED; },
}));

// NOTE: We do NOT mock the sibling route modules themselves.
// all-statuses/route.js imports them at module level, but since
// requireAuth → false, the gate fires before any inner getter is
// called. The sibling imports resolve to their real modules (whose
// top-level code is just declarations + mocked fs/child_process).

function makeRequest(method = "GET", body = null) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/cli-tools/placeholder", init);
}

// Accurate inventory from shell audit (2026-10-29): 27 files, 72 handlers.
const ROUTES = [
  { path: "@/app/api/cli-tools/all-statuses/route.js", methods: ["GET"] },
  { path: "@/app/api/cli-tools/antigravity-mitm/route.js", methods: ["GET", "POST", "DELETE", "PATCH"] },
  { path: "@/app/api/cli-tools/antigravity-mitm/alias/route.js", methods: ["GET", "PUT"] },
  { path: "@/app/api/cli-tools/claude-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/cline-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/codewhale-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/codex-profiles/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/codex-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/copilot-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/cowork-mcp-registry/route.js", methods: ["GET"] },
  { path: "@/app/api/cli-tools/cowork-mcp-tools/route.js", methods: ["POST"] },
  { path: "@/app/api/cli-tools/cowork-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/crush-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/deepseek-tui-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/devin-settings/route.js", methods: ["GET"] },
  { path: "@/app/api/cli-tools/droid-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/forge-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/grok-build-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/hermes-profiles/route.js", methods: ["GET"] },
  { path: "@/app/api/cli-tools/hermes-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/jcode-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/kilo-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/omp-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/openclaw-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/opencode-settings/route.js", methods: ["GET", "POST", "PATCH", "DELETE"] },
  { path: "@/app/api/cli-tools/pi-settings/route.js", methods: ["GET", "POST", "DELETE"] },
  { path: "@/app/api/cli-tools/smelt-settings/route.js", methods: ["GET", "POST", "DELETE"] },
];

describe("requireAuth negative coverage - /api/cli-tools/* (OpenClaw audit 2026-10-29)", () => {
  for (const { path, methods } of ROUTES) {
    const label = path.replace("@/app/api/cli-tools/", "");
    describe(label, () => {
      for (const method of methods) {
        it(`${method} returns 401 when requireAuth -> false`, async () => {
          const mod = await import(path);
          const handler = mod[method];
          expect(handler, `route must export ${method}`).toBeTypeOf("function");
          const body = method === "POST" || method === "PUT" || method === "PATCH"
            ? { baseUrl: "http://x", apiKey: "k", model: "m", mappings: {}, url: "http://x" }
            : null;
          const res = await handler(makeRequest(method, body));
          expect(res.status).toBe(401);
          const resBody = await res.json();
          expect(resBody.error).toBe("Unauthorized");
        });
      }
    });
  }
});
