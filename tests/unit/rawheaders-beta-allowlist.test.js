/**
 * Finding #305: rawHeaders forwarded into upstream requests — allowlist
 * Finding #306: mergeAnthropicBeta has no whitelist
 *
 * #305: chatCore.js was forwarding the entire client header bag to
 * translators/executors via credentials.rawHeaders, enabling header
 * injection (session-fixation via x-session-id, project targeting via
 * x-opencode-project, arbitrary upstream headers).
 *
 * Fix: single chokepoint filter at chatCore.js replaces the full bag
 * with an allowlist of exactly the headers consumers actually read.
 *
 * #306: mergeAnthropicBeta forwarded client anthropic-beta flags
 * verbatim — attacker could inject unknown beta flags.
 * Fix: intersect with ANTHROPIC_BETA_WHITELIST before merging.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mergeAnthropicBeta } from "../../open-sse/providers/shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHATCORE_SRC = readFileSync(
  join(__dirname, "../../open-sse/handlers/chatCore.js"),
  "utf8",
);
const SHARED_SRC = readFileSync(
  join(__dirname, "../../open-sse/providers/shared.js"),
  "utf8",
);

describe("Finding #305: rawHeaders allowlist at chatCore chokepoint", () => {
  it("has an ALLOWED_HEADER_KEYS Set", () => {
    expect(CHATCORE_SRC).toMatch(/ALLOWED_HEADER_KEYS\s*=\s*new\s+Set\(/);
  });

  it("allowlist includes exactly the headers consumers read", () => {
    // Session-id keys
    expect(CHATCORE_SRC).toContain('"x-session-id"');
    expect(CHATCORE_SRC).toContain('"session-id"');
    expect(CHATCORE_SRC).toContain('"session_id"');
    expect(CHATCORE_SRC).toContain('"x-amp-thread-id"');
    expect(CHATCORE_SRC).toContain('"x-claude-code-session-id"');
    // Anthropic beta
    expect(CHATCORE_SRC).toContain('"anthropic-beta"');
    // UA
    expect(CHATCORE_SRC).toContain('"user-agent"');
    // Opencode fingerprint
    expect(CHATCORE_SRC).toContain('"x-opencode-client"');
    expect(CHATCORE_SRC).toContain('"x-opencode-project"');
    // Auth for identity key
    expect(CHATCORE_SRC).toContain('"authorization"');
    expect(CHATCORE_SRC).toContain('"x-api-key"');
  });

  it("filters headers case-insensitively against the allowlist", () => {
    expect(CHATCORE_SRC).toMatch(/ALLOWED_HEADER_KEYS\.has\(k\.toLowerCase\(\)\)/);
  });

  it("assigns sanitized (not raw) to credentials.rawHeaders", () => {
    expect(CHATCORE_SRC).toMatch(/credentials\.rawHeaders\s*=\s*sanitized/);
  });

  it("includes finding reference", () => {
    expect(CHATCORE_SRC).toContain("Finding #305");
  });
});

describe("Finding #306: mergeAnthropicBeta whitelist", () => {
  it("declares ANTHROPIC_BETA_WHITELIST Set", () => {
    expect(SHARED_SRC).toMatch(/ANTHROPIC_BETA_WHITELIST\s*=\s*new\s+Set\(/);
  });

  it("filters flags against the whitelist", () => {
    expect(SHARED_SRC).toMatch(/ANTHROPIC_BETA_WHITELIST\.has\(f\)/);
  });

  it("drops unknown beta flags at runtime", () => {
    const result = mergeAnthropicBeta(
      "claude-code-20250219,evil-flag-2099-01-01",
      "oauth-2025-04-20",
    );
    expect(result).toContain("claude-code-20250219");
    expect(result).toContain("oauth-2025-04-20");
    expect(result).not.toContain("evil-flag");
  });

  it("preserves known flags across multiple inputs", () => {
    const result = mergeAnthropicBeta(
      "claude-code-20250219",
      "interleaved-thinking-2025-05-14,fast-mode-2026-02-01",
    );
    expect(result).toContain("claude-code-20250219");
    expect(result).toContain("interleaved-thinking-2025-05-14");
    expect(result).toContain("fast-mode-2026-02-01");
  });

  it("dedupes repeated flags", () => {
    const result = mergeAnthropicBeta(
      "claude-code-20250219",
      "claude-code-20250219",
    );
    const parts = result.split(",");
    expect(parts.filter((p) => p === "claude-code-20250219")).toHaveLength(1);
  });

  it("returns empty string for all-unknown input", () => {
    expect(mergeAnthropicBeta("evil-1", "evil-2")).toBe("");
  });

  it("includes finding reference", () => {
    expect(SHARED_SRC).toContain("Finding #306");
  });
});
