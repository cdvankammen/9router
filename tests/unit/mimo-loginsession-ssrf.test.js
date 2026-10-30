/**
 * Finding #320: mimoLoginSession proxyUrl SSRF via unsigned cookie
 *
 * The 9r_mimo_login cookie is unsigned. On requireLogin:false deployments
 * the proxy.js middleware gate accepts requests without dashboard auth,
 * so an attacker can forge a cookie with proxyUrl=http://169.254.169.254/
 * and use the server as an SSRF relay to cloud metadata endpoints.
 *
 * Fix: loginFetch rejects any proxyUrl whose literal host is not loopback
 * (127.0.0.1 / ::1 / localhost). DNS-rebinding safe — we never resolve.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC = readFileSync(
  join(__dirname, "../../src/lib/mimoLoginSession.js"),
  "utf8",
);

describe("Finding #320: mimoLoginSession proxyUrl SSRF guard", () => {
  it("has loopback allowlist with 127.0.0.1, ::1, localhost", () => {
    expect(SRC).toMatch(/LOOPBACK_PROXY_HOSTS\s*=\s*new\s+Set\(/);
    expect(SRC).toContain('"127.0.0.1"');
    expect(SRC).toContain('"::1"');
    expect(SRC).toContain('"localhost"');
  });

  it("has assertLoopbackProxyUrl that parses URL and checks hostname literally", () => {
    expect(SRC).toMatch(/function assertLoopbackProxyUrl/);
    // Must use URL parser, not string split
    expect(SRC).toMatch(/new URL\(rawUrl\)/);
    // Must check parsed.hostname against the allowlist
    expect(SRC).toMatch(/LOOPBACK_PROXY_HOSTS\.has\(parsed\.hostname\)/);
  });

  it("rejects scheme that is not http/https/socks", () => {
    expect(SRC).toMatch(/\^\(https\?\|socks\[45\]h\?\):\$/i);
  });

  it("loginFetch calls the guard and falls back to direct fetch on rejection", () => {
    const fnStart = SRC.indexOf("async function loginFetch");
    const fnBody = SRC.slice(fnStart, fnStart + 2000);
    expect(fnBody).toMatch(/if\s*\(!assertLoopbackProxyUrl\(sessionProxyUrl\)\)/);
    expect(fnBody).toMatch(/SSRF guard/);
  });

  it("includes the finding reference", () => {
    expect(SRC).toContain("Finding #320");
  });

  it("does not resolve DNS on the proxy URL (DNS-rebinding safe)", () => {
    const guardStart = SRC.indexOf("function assertLoopbackProxyUrl");
    const guardEnd = SRC.indexOf("\n}", guardStart) + 2;
    const guardBody = SRC.slice(guardStart, guardEnd);
    expect(guardBody).not.toMatch(/dns\.(promises\.)?lookup/);
    expect(guardBody).not.toMatch(/assertPublicUrlResolved/);
  });
});
