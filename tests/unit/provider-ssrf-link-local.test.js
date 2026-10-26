import { describe, it, expect } from "vitest";
import {
  assertNotLinkLocal,
  assertNotLinkLocalResolved,
} from "@/shared/utils/ssrfGuard.js";

// Tests for the link-local / cloud-metadata SSRF guard added to protect the
// user-controllable baseUrl path in /api/providers/[id]/test (testUtils.js)
// and /api/providers/validate. The existing assertPublicUrlResolved blocks
// RFC1918 + loopback, but that would break legitimate local-model routing
// (Ollama at localhost:11434, LAN vLLM at 192.168.x/10.x, Tailscale CGNAT
// at 100.64/10) — the one class of IP that is NEVER a legitimate model
// host is 169.254.0.0/16 (cloud metadata + link-local), so this guard
// blocks only that class.

describe("assertNotLinkLocal — literal URL check", () => {
  it.each([
    ["http://localhost:11434", "Ollama loopback"],
    ["http://127.0.0.1:11434", "Ollama 127.x"],
    ["http://192.168.1.50:8000", "LAN vLLM RFC1918 /24"],
    ["http://10.0.0.5:11434", "RFC1918 /8"],
    ["http://172.16.0.1:8000", "RFC1918 /12"],
    ["http://100.76.147.49:11434", "Tailscale CGNAT"],
    ["http://100.100.100.100:11434", "Tailscale CGNAT mid"],
    ["https://api.openai.com/v1/models", "public HTTPS"],
    ["http://api.llm7.io/v1", "public HTTP"],
    ["http://mini2-9.local:11434", "mDNS hostname"],
    ["http://[fd00::1]:8000", "IPv6 ULA (private but legitimate)"],
  ])("accepts %s (%s)", (url) => {
    expect(() => assertNotLinkLocal(url)).not.toThrow();
  });

  it.each([
    ["http://169.254.169.254/latest/meta-data/", "AWS metadata"],
    ["http://169.254.169.254/metadata/v1/", "DigitalOcean metadata"],
    ["http://169.254.169.254/metadata/instance", "Azure metadata"],
    ["http://169.254.170.2/", "ECS task metadata"],
    ["http://169.254.0.1/", "generic link-local"],
    ["http://169.254.255.255/", "link-local broadcast"],
    ["http://[fe80::1]:8000/", "IPv6 link-local"],
    ["http://[::ffff:169.254.169.254]/", "IPv4-mapped metadata"],
  ])("rejects %s (%s)", (url) => {
    expect(() => assertNotLinkLocal(url)).toThrow(/link-local|cloud-metadata/);
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => assertNotLinkLocal("file:///etc/passwd")).toThrow(/scheme/);
    expect(() => assertNotLinkLocal("gopher://host/")).toThrow(/scheme/);
    expect(() => assertNotLinkLocal("ftp://host/")).toThrow(/scheme/);
  });

  it("rejects embedded credentials", () => {
    expect(() => assertNotLinkLocal("http://user:pass@evil.com/")).toThrow(/credentials/);
    expect(() => assertNotLinkLocal("http://attacker:@evil.com/")).toThrow(/credentials/);
  });

  it("rejects malformed URLs", () => {
    expect(() => assertNotLinkLocal("not a url")).toThrow(/Invalid URL/);
    expect(() => assertNotLinkLocal("")).toThrow();
  });
});

describe("assertNotLinkLocalResolved — async DNS-rebinding check", () => {
  it("accepts a legitimate public host", async () => {
    await expect(assertNotLinkLocalResolved("https://api.openai.com/v1/models")).resolves.not.toThrow();
  });

  it("rejects literal link-local without DNS lookup", async () => {
    await expect(
      assertNotLinkLocalResolved("http://169.254.169.254/latest/meta-data/")
    ).rejects.toThrow(/link-local|cloud-metadata/);
  });

  it("preserves local model routing (Ollama on loopback)", async () => {
    // Production-critical: must not break localhost:11434 for Ollama
    await expect(
      assertNotLinkLocalResolved("http://localhost:11434/api/tags")
    ).resolves.not.toThrow();
    await expect(
      assertNotLinkLocalResolved("http://127.0.0.1:11434/api/chat")
    ).resolves.not.toThrow();
  });

  it("preserves LAN vLLM routing (RFC1918)", async () => {
    await expect(
      assertNotLinkLocalResolved("http://192.168.1.50:8000/v1/models")
    ).resolves.not.toThrow();
    await expect(
      assertNotLinkLocalResolved("http://10.0.0.5:11434/api/tags")
    ).resolves.not.toThrow();
  });

  it("preserves Tailscale CGNAT routing", async () => {
    await expect(
      assertNotLinkLocalResolved("http://100.76.147.49:11434/api/tags")
    ).resolves.not.toThrow();
  });
});
