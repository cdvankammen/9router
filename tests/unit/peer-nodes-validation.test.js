import { describe, it, expect } from "vitest";
import { validatePeerNode, validatePeerNodes } from "@/lib/network/peerNodesValidator.js";

describe("validatePeerNode", () => {
  it.each([
    ["http://mini2-9.local:20128", "mDNS hostname"],
    ["http://mini4.lan:20129", ".lan hostname"],
    ["http://192.168.1.189:20129", "RFC1918 /24"],
    ["http://10.0.0.5:20128", "RFC1918 /8"],
    ["http://172.16.0.1:20128", "RFC1918 /12 low"],
    ["http://172.31.255.254:20128", "RFC1918 /12 high"],
    ["http://100.76.147.49:20128", "Tailscale CGNAT"],
    ["http://100.100.100.100:20128", "Tailscale CGNAT mid"],
    ["https://router.example.com:20128", "HTTPS public"],
    ["http://example.com/", "plain http public"],
    ["http://EXAMPLE.COM:20128/path", "uppercase normalized"],
    ["  http://mini2:20128/  ", "whitespace trimmed"],
    ["http://mini2:20128///", "trailing slashes normalized"],
  ])("accepts %s (%s)", (url) => {
    const r = validatePeerNode(url);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(typeof r.normalized).toBe("string");
  });

  it.each([
    ["file:///etc/passwd", "bad-scheme"],
    ["ftp://host/path", "bad-scheme"],
    ["javascript:alert(1)", "bad-scheme"],
    ["data:text/plain,hi", "bad-scheme"],
    ["gopher://host/", "bad-scheme"],
  ])("rejects non-http(s) scheme %s", (url, reason) => {
    const r = validatePeerNode(url);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
  });

  it.each([
    ["http://user:pass@evil.com/", "embedded-credentials"],
    ["http://attacker:@evil.com/", "embedded-credentials"],
    ["http://:secret@evil.com/", "embedded-credentials"],
  ])("rejects embedded credentials %s", (url, reason) => {
    const r = validatePeerNode(url);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
  });

  it.each([
    ["http://169.254.169.254/latest/meta-data/", "AWS metadata"],
    ["http://169.254.169.254/metadata/v1/", "DO metadata"],
    ["http://169.254.170.2/", "ECS task metadata"],
    ["http://169.254.0.1/", "generic link-local"],
    ["http://169.254.255.255/", "link-local broadcast"],
    ["http://[::ffff:169.254.169.254]/", "IPv4-mapped metadata"],
  ])("rejects link-local / cloud metadata %s", (url) => {
    const r = validatePeerNode(url);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("link-local");
  });

  it.each([
    ["http://127.0.0.1:20128", "127.0.0.1"],
    ["http://127.0.0.2:20128", "127.x loopback /8"],
    ["http://127.255.255.255:20128", "127.x loopback /8 high"],
    ["http://localhost:20128", "localhost hostname"],
    ["http://localhost.localdomain:20128", "localhost.localdomain"],
  ])("rejects loopback %s", (url) => {
    const r = validatePeerNode(url);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("loopback");
  });

  it("rejects IPv6 literals (runtime is IPv4-only by default)", () => {
    const r = validatePeerNode("http://[fe80::1]:20128/");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ipv6-not-allowed");
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["not a url", "invalid-url"],
    // Node's URL parser throws on "http://" (malformed — no authority), so
    // the validator surfaces this as invalid-url rather than no-host. The
    // end result is identical: the entry is rejected.
    ["http://", "invalid-url"],
    [123, "not-a-string"],
    [null, "not-a-string"],
    [{}, "not-a-string"],
  ])("rejects %s (%s)", (url, reason) => {
    const r = validatePeerNode(url);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
  });
});

describe("validatePeerNodes (array)", () => {
  it("accepts an empty array (feature off)", () => {
    expect(validatePeerNodes([])).toEqual({ ok: true, entries: [] });
  });

  it("normalizes and validates a legitimate peer list", () => {
    const r = validatePeerNodes([
      "http://mini2-9.local:20128",
      "http://192.168.1.189:20129/",
      "  http://100.76.147.49:20128  ",
    ]);
    expect(r.ok).toBe(true);
    expect(r.entries).toEqual([
      "http://mini2-9.local:20128",
      "http://192.168.1.189:20129",
      "http://100.76.147.49:20128",
    ]);
  });

  it("collects all errors when multiple entries are invalid", () => {
    const r = validatePeerNodes([
      "http://mini2:20128",                    // ok
      "http://169.254.169.254/",               // link-local
      "http://user:pass@evil.com/",            // embedded creds
      "file:///etc/passwd",                    // bad scheme
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(3);
    expect(r.errors.map((e) => e.reason).sort()).toEqual([
      "bad-scheme",
      "embedded-credentials",
      "link-local",
    ]);
  });

  it("rejects non-array input", () => {
    const r = validatePeerNodes("http://mini2:20128");
    expect(r.ok).toBe(false);
    expect(r.errors[0].reason).toBe("not-an-array");
  });

  it("rejects object input (mass-assignment attempt)", () => {
    const r = validatePeerNodes({ "0": "http://evil/" });
    expect(r.ok).toBe(false);
  });
});
