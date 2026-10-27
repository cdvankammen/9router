// custom-server.js is the only thing that makes x-9r-real-ip trustworthy. Boot a real
// HTTP server through it and confirm a client cannot smuggle its own peer headers in.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import http from "node:http";
import { __test__ as requestDetails } from "@/lib/db/repos/requestDetailsRepo.js";

const require = createRequire(import.meta.url);

let server;
let baseUrl;
let seenHeaders;

beforeAll(async () => {
  require("../../custom-server.js");
  server = http.createServer((req, res) => {
    seenHeaders = req.headers;
    res.end("ok");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function get(headers = {}) {
  await fetch(baseUrl, { headers });
  return seenHeaders;
}

describe("custom-server peer header sanitizing", () => {
  it("generates a peer trust token at boot", () => {
    expect(process.env.NINEROUTER_PEER_TOKEN).toMatch(/^[0-9a-f]{48}$/);
  });

  it("replaces a client-supplied x-9r-real-ip with the socket address", async () => {
    const headers = await get({ "x-9r-real-ip": "203.0.113.55" });

    expect(headers["x-9r-real-ip"]).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
  });

  it("stamps the trust token so downstream can tell the wrapper ran", async () => {
    const headers = await get();

    expect(headers["x-9r-peer-token"]).toBe(process.env.NINEROUTER_PEER_TOKEN);
  });

  it("drops a client-supplied peer trust token", async () => {
    const headers = await get({ "x-9r-peer-token": "forged-token" });

    expect(headers["x-9r-peer-token"]).toBe(process.env.NINEROUTER_PEER_TOKEN);
    expect(headers["x-9r-peer-token"]).not.toBe("forged-token");
  });

  it("drops a client-supplied x-9r-via-proxy marker", async () => {
    const headers = await get({ "x-9r-via-proxy": "1" });

    expect(headers["x-9r-via-proxy"]).toBeUndefined();
  });

  it("marks via-proxy and adopts the forwarded IP for a loopback proxy hop", async () => {
    const headers = await get({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });

    expect(headers["x-9r-via-proxy"]).toBe("1");
    expect(headers["x-9r-real-ip"]).toBe("203.0.113.9");
    expect(headers["x-forwarded-for"]).toBeUndefined();
  });

  // ── Bug GG (2026-10-27): host/proto forwarding headers must be stripped ──
  // Without this, oidc.js getPublicOrigin() and saml.js getSamlBaseUrl() build
  // redirect_uri from an attacker-supplied x-forwarded-host when BASE_URL is
  // unset, enabling SSO authorization-code theft via LAN header injection.
  // See Stage 4 of docs/plans-and-prompts/security/2026-10-26-per-pr-security-review.md.
  it("strips x-forwarded-host to prevent SSO redirect_uri hijack (Bug GG)", async () => {
    const headers = await get({ "x-forwarded-host": "evil.example.com" });
    expect(headers["x-forwarded-host"]).toBeUndefined();
  });

  it("strips x-forwarded-proto so OIDC/SAML cannot be coerced to https (Bug GG)", async () => {
    const headers = await get({ "x-forwarded-proto": "https" });
    expect(headers["x-forwarded-proto"]).toBeUndefined();
  });

  it("strips x-forwarded-server, x-original-host, x-real-host (Bug GG depth)", async () => {
    const headers = await get({
      "x-forwarded-server": "evil.example.com",
      "x-original-host": "evil.example.com",
      "x-real-host": "evil.example.com",
    });
    expect(headers["x-forwarded-server"]).toBeUndefined();
    expect(headers["x-original-host"]).toBeUndefined();
    expect(headers["x-real-host"]).toBeUndefined();
  });

  it("strips all Bug GG headers together and still derives the real IP", async () => {
    const headers = await get({
      "x-forwarded-for": "203.0.113.9",
      "x-forwarded-host": "evil.example.com",
      "x-forwarded-proto": "https",
      "x-forwarded-server": "evil.example.com",
      "x-original-host": "evil.example.com",
      "x-real-host": "evil.example.com",
    });
    expect(headers["x-forwarded-for"]).toBeUndefined();
    expect(headers["x-forwarded-host"]).toBeUndefined();
    expect(headers["x-forwarded-proto"]).toBeUndefined();
    expect(headers["x-forwarded-server"]).toBeUndefined();
    expect(headers["x-original-host"]).toBeUndefined();
    expect(headers["x-real-host"]).toBeUndefined();
    // Loopback-proxy trust path still works: forwarded IP adopted.
    expect(headers["x-9r-real-ip"]).toBe("203.0.113.9");
  });

  // chat.js snapshots every client header into the request detail. Anything that grants
  // access must not survive into a record the dashboard renders and cloud sync uploads.
  it("keeps the peer token out of persisted request details", () => {
    const sanitized = requestDetails.sanitizeHeaders({
      "x-9r-peer-token": "secret",
      "x-9r-cli-token": "secret",
      "authorization": "Bearer sk-x",
      "x-9r-real-ip": "127.0.0.1",
    });

    expect(sanitized["x-9r-peer-token"]).toBeUndefined();
    expect(sanitized["x-9r-cli-token"]).toBeUndefined();
    expect(sanitized["authorization"]).toBeUndefined();
    expect(sanitized["x-9r-real-ip"]).toBe("127.0.0.1");
  });
});
