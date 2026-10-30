// Security hardening test for finding #316 / exfil chain #3:
// outboundProxyUrl SSRF. An authenticated user setting the outbound proxy
// URL previously had no link-local/cloud-metadata guard — URLs targeting
// 169.254.169.254 (AWS/GCP/Azure metadata) or 169.254.170.2 (ECS task
// metadata) passed validation. Once written to process.env.HTTP_PROXY,
// every outbound provider call (OAuth token refresh, smart-router probe,
// webhook, quota auto-ping) traverses the metadata endpoint and leaks
// credentials to the attacker.
//
// Two defense layers:
//   Layer 1 (sync literal check in validateProxyUrl via
//     isLinkLocalOrMetadataHost): rejects at applyOutboundProxyEnv time
//   Layer 2 (async DNS-resolved check in settings PATCH before
//     persisting): blocks wildcard-DNS domains (nip.io/sslip.io) that
//     resolve to link-local IPs
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Finding #316: outboundProxyUrl rejects link-local / cloud-metadata targets", () => {
  const ORIGINAL_HTTP_PROXY = process.env.HTTP_PROXY;
  const ORIGINAL_HTTPS_PROXY = process.env.HTTPS_PROXY;
  const ORIGINAL_ALL_PROXY = process.env.ALL_PROXY;
  const ORIGINAL_NO_PROXY = process.env.NO_PROXY;
  const ORIGINAL_NINE_ROUTER_PROXY_MANAGED = process.env.NINE_ROUTER_PROXY_MANAGED;
  const ORIGINAL_NINE_ROUTER_PROXY_URL = process.env.NINE_ROUTER_PROXY_URL;
  const ORIGINAL_NINE_ROUTER_NO_PROXY = process.env.NINE_ROUTER_NO_PROXY;

  beforeEach(() => {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.NINE_ROUTER_PROXY_MANAGED;
    delete process.env.NINE_ROUTER_PROXY_URL;
    delete process.env.NINE_ROUTER_NO_PROXY;
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_HTTP_PROXY !== undefined) process.env.HTTP_PROXY = ORIGINAL_HTTP_PROXY;
    else delete process.env.HTTP_PROXY;
    if (ORIGINAL_HTTPS_PROXY !== undefined) process.env.HTTPS_PROXY = ORIGINAL_HTTPS_PROXY;
    else delete process.env.HTTPS_PROXY;
    if (ORIGINAL_ALL_PROXY !== undefined) process.env.ALL_PROXY = ORIGINAL_ALL_PROXY;
    else delete process.env.ALL_PROXY;
    if (ORIGINAL_NO_PROXY !== undefined) process.env.NO_PROXY = ORIGINAL_NO_PROXY;
    else delete process.env.NO_PROXY;
    if (ORIGINAL_NINE_ROUTER_PROXY_MANAGED !== undefined) process.env.NINE_ROUTER_PROXY_MANAGED = ORIGINAL_NINE_ROUTER_PROXY_MANAGED;
    else delete process.env.NINE_ROUTER_PROXY_MANAGED;
    if (ORIGINAL_NINE_ROUTER_PROXY_URL !== undefined) process.env.NINE_ROUTER_PROXY_URL = ORIGINAL_NINE_ROUTER_PROXY_URL;
    else delete process.env.NINE_ROUTER_PROXY_URL;
    if (ORIGINAL_NINE_ROUTER_NO_PROXY !== undefined) process.env.NINE_ROUTER_NO_PROXY = ORIGINAL_NINE_ROUTER_NO_PROXY;
    else delete process.env.NINE_ROUTER_NO_PROXY;
  });

  it("Layer 1: rejects AWS metadata IP 169.254.169.254", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://169.254.169.254/latest/meta-data/",
    });
    // Must NOT write HTTP_PROXY — the metadata IP is blocked.
    expect(process.env.HTTP_PROXY).toBeUndefined();
    expect(process.env.NINE_ROUTER_PROXY_MANAGED).toBeUndefined();
  });

  it("Layer 1: rejects ECS task metadata IP 169.254.170.2", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://169.254.170.2/",
    });
    expect(process.env.HTTP_PROXY).toBeUndefined();
  });

  it("Layer 1: rejects any 169.254.x.x link-local address", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://169.254.1.2:8080/",
    });
    expect(process.env.HTTP_PROXY).toBeUndefined();
  });

  it("Layer 1: rejects IPv6 link-local fe80::", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://[fe80::1]:8080/",
    });
    expect(process.env.HTTP_PROXY).toBeUndefined();
  });

  it("Layer 1: still permits legitimate LAN proxies (RFC1918 private ranges)", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://192.168.1.50:3128/",
    });
    // RFC1918 192.168.x is intentionally allowed.
    expect(process.env.HTTP_PROXY).toContain("192.168.1.50");
  });

  it("Layer 1: still permits loopback proxies (local mitmproxy debugging)", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "http://127.0.0.1:8080/",
    });
    expect(process.env.HTTP_PROXY).toContain("127.0.0.1");
  });

  it("Layer 1: still permits socks5 proxies (scheme allowlist is independent)", async () => {
    const { applyOutboundProxyEnv } = await import("../../src/lib/network/outboundProxy.js");
    applyOutboundProxyEnv({
      outboundProxyEnabled: true,
      outboundProxyUrl: "socks5://proxy.example.com:1080/",
    });
    expect(process.env.ALL_PROXY).toBe("socks5://proxy.example.com:1080/");
  });

  it("source-level: outboundProxy.js imports isLinkLocalOrMetadataHost from ssrfGuard", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/lib/network/outboundProxy.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#316/);
    expect(src).toMatch(/isLinkLocalOrMetadataHost/);
    expect(src).toMatch(/from\s+["']@\/shared\/utils\/ssrfGuard/);
  });

  it("source-level: settings PATCH route uses assertHostNotLinkLocalResolved before persisting", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/settings/route.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#316/);
    expect(src).toMatch(/assertHostNotLinkLocalResolved/);
    // The async check must fire BEFORE updateSettings(body).
    const checkIdx = src.indexOf("assertHostNotLinkLocalResolved");
    const updateIdx = src.indexOf("updateSettings(body)");
    expect(checkIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeLessThan(updateIdx);
  });

  it("ssrfGuard exports both new primitives (scheme-agnostic host checks)", async () => {
    const guard = await import("../../src/shared/utils/ssrfGuard.js");
    expect(typeof guard.isLinkLocalOrMetadataHost).toBe("function");
    expect(typeof guard.assertHostNotLinkLocalResolved).toBe("function");
    // Sanity: the sync primitive must reject 169.254.169.254 and accept 192.168.1.1.
    expect(guard.isLinkLocalOrMetadataHost("169.254.169.254")).toBe(true);
    expect(guard.isLinkLocalOrMetadataHost("192.168.1.1")).toBe(false);
    expect(guard.isLinkLocalOrMetadataHost("proxy.example.com")).toBe(false);
  });
});
