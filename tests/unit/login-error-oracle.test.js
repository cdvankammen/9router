// Security hardening test for findings #324 and #340: login error oracle
// reveals password storage internals via bcrypt error differentiation.
//
// bcrypt.compare can throw on a corrupt stored hash ("Invalid salt",
// "Invalid salt rounds", "data and hash arguments required"). If the
// catch block returns error.message to the unauthenticated caller, an
// attacker learns: (a) the hash format is bcrypt, (b) a stored hash
// exists, (c) what shape it takes — all without authenticating.
//
// The fix: swallow ALL unexpected errors into a uniform response so
// the caller learns nothing beyond "something went wrong."
import { describe, expect, it, vi, beforeAll } from "vitest";

// Force bcrypt.compare to throw — this is the actual attack surface we
// are pinning. bcryptjs does NOT throw on an invalid hash shape by
// default (it just returns false), so we mock it to simulate the
// "corrupt stored hash" scenario.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async () => {
      throw new Error("Invalid salt");
    }),
  },
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(async () => ({
    password: "$2a$10$corrupt.hash.that.triggers.bcrypt",
    authMode: "password",
    requireLogin: true,
    tunnelUrl: "",
    tailscaleUrl: "",
  })),
}));
vi.mock("@/lib/auth/loginLimiter", () => ({
  checkLock: vi.fn(() => ({ locked: false })),
  recordFail: vi.fn(() => ({ remainingBeforeLock: 4 })),
  recordSuccess: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));
vi.mock("@/lib/auth/dashboardSession", () => ({
  setDashboardAuthCookie: vi.fn(async () => {}),
}));
vi.mock("@/lib/auth/oidc", () => ({
  isOidcConfigured: vi.fn(() => false),
}));
vi.mock("@/lib/auth/saml.js", () => ({
  isSamlConfigured: vi.fn(() => false),
}));

let POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/auth/login/route.js"));
});

describe("Finding #324/#340: login catch block swallows bcrypt errors", () => {
  it("bcrypt throw returns generic 500 with no raw error.message leak", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "anything" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    // Must be the generic message — NOT the raw bcrypt error.
    expect(body.error).toBe("Internal server error");
    // Must NOT leak bcrypt internals anywhere in the serialized response.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/Invalid salt/i);
    expect(serialized).not.toMatch(/salt rounds/i);
    expect(serialized).not.toMatch(/data and hash/i);
  });

  it("source-level: catch block does not return error.message to the client", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/auth/login/route.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#324/);
    // The catch block must use a uniform message, not error.message.
    expect(src).toMatch(/catch\s*\(error\)\s*\{[\s\S]*?Internal server error/);
    // The old vulnerable pattern must be gone: catch block must NOT
    // return error.message in the JSON body.
    expect(src).not.toMatch(/catch\s*\(error\)\s*\{[^}]*error:\s*error\.message/);
  });
});
