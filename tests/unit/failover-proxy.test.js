// Automated test for cli/failover-proxy.cjs — the L2 node-DOWN failover proxy.
// Spawns the real proxy as a child process with two local echo servers and
// verifies: local-preferred routing, failover to peer on local death, failback
// on local restart, loop protection, both-down fail-open, and proxy survival.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROXY = path.join(ROOT, "cli/failover-proxy.cjs");

const LOCAL_PORT = 20260;
const PEER_PORT = 20261;
const PROXY_PORT = 20262;

function makeServer(port, name) {
  return http.createServer((req, res) => {
    if (req.url === "/api/health") { res.writeHead(200); return res.end("ok-" + name); }
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ node: name, body: b.slice(0, 60) }));
    });
  }).listen(port, "127.0.0.1");
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = makeServer(port, port === LOCAL_PORT ? "LOCAL-A" : "PEER-B");
    server.on("listening", () => resolve(server));
    server.on("error", reject);
  });
}

function request(port, { method = "POST", path: p = "/v1/chat/completions", headers = {}, body = "{}", timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: p, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error("request timeout")); });
    // NOTE: never send a body on GET — Node's http client sends GET bodies
    // WITHOUT Content-Length, which is malformed HTTP and breaks the
    // keep-alive connection (the proxy correctly 400s it).
    if (body && method !== "GET") req.end(body);
    else req.end();
  });
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(port, attempts = 20, interval = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await request(port, { method: "GET", path: "/api/health" });
      if (r.status < 500) return true;
    } catch { /* retry */ }
    await wait(interval);
  }
  return false;
}

describe("failover-proxy (L2) — node-DOWN protection", () => {
  let local, peer, proxy;

  beforeAll(async () => {
    local = await listen(LOCAL_PORT);
    peer = await listen(PEER_PORT);
    proxy = spawn(process.execPath, [PROXY,
      "--listen", String(PROXY_PORT),
      "--local", `http://localhost:${LOCAL_PORT}`,
      "--peer", `http://localhost:${PEER_PORT}`,
    ], { stdio: "ignore" });
    await waitFor(PROXY_PORT);
  }, 15000);

  afterAll(() => {
    if (proxy) proxy.kill();
    if (local) local.close();
    if (peer) peer.close();
  });

  it("T1: both up → routes to LOCAL", async () => {
    const r = await request(PROXY_PORT);
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).node).toBe("LOCAL-A");
  });

  it("T2: local killed → routes to PEER", async () => {
    await new Promise((r) => local.close(r));
    await wait(3500); // probe interval 2s + margin
    const r = await request(PROXY_PORT);
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).node).toBe("PEER-B");
  });

  it("T3: local restored → fails back to LOCAL", async () => {
    local = await listen(LOCAL_PORT);
    await wait(3500);
    const r = await request(PROXY_PORT);
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).node).toBe("LOCAL-A");
  });

  it("T4: loop protection — x-9r-failover:1 is 502'd", async () => {
    const r = await request(PROXY_PORT, { headers: { "x-9r-failover": "1" } });
    expect(r.status).toBe(502);
    expect(r.body).toContain("failover loop detected");
  });

  it("T5: both down → fail-open to local (real app error, proxy survives)", async () => {
    await new Promise((r) => local.close(r));
    await new Promise((r) => peer.close(r));
    await wait(3500);
    const r = await request(PROXY_PORT);
    expect(r.status).toBe(502);
    expect(r.body).toContain("failover proxy upstream error");
    // proxy process still alive
    expect(proxy.exitCode).toBeNull();
  });

  it("T6: client abort mid-request does not crash the proxy", async () => {
    // Re-open local with a slow-stream endpoint, then abort mid-stream.
    local = http.createServer((req, res) => {
      if (req.url === "/api/health") { res.writeHead(200); return res.end("ok"); }
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const iv = setInterval(() => res.write("data: x\n\n"), 200);
      req.on("close", () => clearInterval(iv));
    }).listen(LOCAL_PORT, "127.0.0.1");
    await wait(3500);

    await new Promise((resolve) => {
      const req = http.request({ host: "127.0.0.1", port: PROXY_PORT, path: "/slow", method: "GET" }, (res) => {
        res.once("data", () => { req.destroy(); resolve(); });
      });
      req.on("error", () => resolve()); // ECONNRESET expected
      req.end();
    });
    await wait(500);
    expect(proxy.exitCode).toBeNull();
    const r = await request(PROXY_PORT, { method: "GET", path: "/api/health" });
    expect({ status: r.status, body: r.body.slice(0, 200) }).toEqual({ status: 200, body: "ok" });
  });
});
