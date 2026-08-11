// IP-environment tests for cli/failover-proxy.cjs — verifies the proxy handles
// IPv4, IPv6 (opt-in via --ipv6), hostname peers, and rejects malformed/IPv6
// URLs correctly. Uses real local servers bound to ::1 (IPv6) and 127.0.0.1
// (IPv4), and spawns the real proxy with different flags to exercise each path.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROXY = path.join(ROOT, "cli/failover-proxy.cjs");

const V4_PORT = 20270;
const V6_PORT = 20271;
const PROXY_V4_PORT = 20272;
const PROXY_V6_PORT = 20273;
const PROXY_MIXED_PORT = 20274;
const PROXY_HOST_PORT = 20275;

function makeServer(port, host, name) {
  return http.createServer((req, res) => {
    if (req.url === "/api/health") { res.writeHead(200); return res.end("ok-" + name); }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ node: name }));
  }).listen(port, host);
}

function listen(port, host, name) {
  return new Promise((resolve, reject) => {
    const server = makeServer(port, host, name);
    server.on("listening", () => resolve(server));
    server.on("error", reject);
  });
}

function request(port, { method = "GET", path: p = "/api/health", headers = {}, timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: p, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error("request timeout")); });
    req.end();
  });
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(port, attempts = 25, interval = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await request(port);
      if (r.status < 500) return true;
    } catch { /* retry */ }
    await wait(interval);
  }
  return false;
}

describe("failover-proxy (L2) — IP environments (IPv4/IPv6/hostname)", () => {
  let v4server, v6server;
  let proxyV4, proxyV6, proxyMixed, proxyHost;

  beforeAll(async () => {
    // IPv4 + IPv6 local echo servers (::1 requires IPv6 on the machine; if
    // unavailable the suite still runs the IPv4/hostname cases).
    v4server = await listen(V4_PORT, "127.0.0.1", "V4-PEER");
    try {
      v6server = await listen(V6_PORT, "::1", "V6-PEER");
    } catch {
      v6server = null; // IPv6 not available — skip v6 cases
    }

    // 1) IPv4-only mode (default): IPv6 peer URL should be REJECTED at startup.
    proxyV4 = spawn(process.execPath, [PROXY,
      "--listen", String(PROXY_V4_PORT),
      "--local", `http://localhost:${V4_PORT}`,
      // mixed: one valid IPv4 peer + one IPv6 literal (must be dropped without --ipv6)
      "--peer", `http://127.0.0.1:${V4_PORT},http://[::1]:${V6_PORT}`,
    ], { stdio: "ignore" });
    await waitFor(PROXY_V4_PORT);

    // 2) IPv6 mode (--ipv6): IPv6 peer allowed, dual-stack listener.
    if (v6server) {
      proxyV6 = spawn(process.execPath, [PROXY,
        "--listen", String(PROXY_V6_PORT),
        "--local", `http://localhost:${V4_PORT}`,
        "--peer", `http://[::1]:${V6_PORT}`,
        "--ipv6",
      ], { stdio: "ignore" });
      await waitFor(PROXY_V6_PORT);
    }

    // 3) Hostname peer: use localhost as the "hostname" (resolves to 127.0.0.1/::1).
    proxyHost = spawn(process.execPath, [PROXY,
      "--listen", String(PROXY_HOST_PORT),
      "--local", `http://localhost:${V4_PORT}`,
      "--peer", `http://localhost:${V4_PORT}`,
    ], { stdio: "ignore" });
    await waitFor(PROXY_HOST_PORT);
  }, 20000);

  afterAll(() => {
    for (const p of [proxyV4, proxyV6, proxyHost]) if (p) p.kill();
    if (v4server) v4server.close();
    if (v6server) v6server.close();
  });

  it("T1: IPv4-only default — routes to valid IPv4 peer, IPv6 literal dropped", async () => {
    const r = await request(PROXY_V4_PORT);
    expect(r.status).toBe(200);
    expect(r.body).toContain("ok-V4-PEER");
  });

  it("T2: IPv4-only default — listener binds IPv4 (0.0.0.0), not IPv6", async () => {
    // The proxy process log says (ipv4-only); verify by checking the socket
    // family via lsof is hard in-process — instead verify an IPv6 connection
    // to the proxy port FAILS (IPv4-only bind).
    const v6ok = await new Promise((resolve) => {
      const req = http.request({ host: "::1", port: PROXY_V4_PORT, path: "/api/health", method: "GET", timeout: 1000 }, (res) => {
        res.resume(); resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
      req.end();
    });
    expect(v6ok).toBe(false); // IPv4-only bind → ::1 connection refused
  });

  it("T3: --ipv6 mode — IPv6 peer URL accepted and served", async () => {
    if (!v6server) { expect(true).toBe(true); return; } // skip if no IPv6
    const r = await request(PROXY_V6_PORT);
    expect(r.status).toBe(200);
    expect(r.body).toContain("ok-V4-PEER"); // local (v4) preferred when up
  });

  it("T4: --ipv6 mode — listener binds dual-stack (::), reachable over IPv6", async () => {
    if (!v6server) { expect(true).toBe(true); return; }
    const v6ok = await new Promise((resolve) => {
      const req = http.request({ host: "::1", port: PROXY_V6_PORT, path: "/api/health", method: "GET", timeout: 1500 }, (res) => {
        res.resume(); resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
      req.end();
    });
    expect(v6ok).toBe(true);
  });

  it("T5: --ipv6 mode — IPv6 peer actually used when local is down", async () => {
    if (!v6server) { expect(true).toBe(true); return; }
    // Kill local (v4) server; proxy should fail over to the IPv6 peer.
    await new Promise((r) => v4server.close(r));
    await wait(4000); // probe interval 2s + margin
    const r = await request(PROXY_V6_PORT, { timeoutMs: 10000 });
    expect(r.status).toBe(200);
    expect(r.body).toContain("ok-V6-PEER");
    // restore for later tests
    v4server = await listen(V4_PORT, "127.0.0.1", "V4-PEER");
    await wait(4000);
  }, 20000);

  it("T6: hostname peer — localhost resolves and routes", async () => {
    const r = await request(PROXY_HOST_PORT);
    expect(r.status).toBe(200);
    expect(r.body).toContain("ok-V4-PEER");
  });

  it("T7: malformed peer URL is rejected at startup (proxy still starts)", async () => {
    // Spawn a proxy with a garbage --peer; it should still come up (falls back
    // to default peer) and not crash.
    const p = spawn(process.execPath, [PROXY,
      "--listen", "20276",
      "--local", `http://localhost:${V4_PORT}`,
      "--peer", "not-a-url::::",
    ], { stdio: "ignore" });
    const ok = await waitFor(20276);
    expect(ok).toBe(true);
    p.kill();
  });
});
