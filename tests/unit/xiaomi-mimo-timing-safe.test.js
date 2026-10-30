/**
 * Finding #323: xiaomi-mimo API key import uses timing-safe comparison
 *
 * The dedup path in /api/oauth/xiaomi-mimo/api-key compared stored
 * access tokens with plain === which leaks match length via timing.
 * Fix: crypto.timingSafeEqual with length-early-return, same pattern
 * as requireAuth.hasValidCliToken.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC = readFileSync(
  join(__dirname, "../../src/app/api/oauth/xiaomi-mimo/api-key/route.js"),
  "utf8",
);

describe("Finding #323: xiaomi-mimo timing-safe key comparison", () => {
  it("imports crypto from node:crypto", () => {
    expect(SRC).toMatch(/import crypto from ["']node:crypto["']/);
  });

  it("uses timingSafeEqual instead of === for accessToken comparison", () => {
    expect(SRC).toContain("crypto.timingSafeEqual");
    // The old vulnerable pattern was: c.accessToken === key
    // Find the dedup block (between "Dedup:" comment and the closing of .find())
    const dedupStart = SRC.indexOf("// Dedup:");
    expect(dedupStart).toBeGreaterThan(0);
    const dedupEnd = SRC.indexOf("if (existing)", dedupStart);
    const dedupBlock = SRC.slice(dedupStart, dedupEnd);
    // The vulnerable pattern should NOT appear in the dedup block
    expect(dedupBlock).not.toMatch(/accessToken\s*===\s*key/);
    // The safe wrapper should be present
    expect(dedupBlock).toMatch(/safeKeyMatch\(c\.accessToken,\s*key\)/);
  });

  it("safeKeyMatch has length-early-return (timingSafeEqual requirement)", () => {
    expect(SRC).toMatch(/if \(a\.length !== b\.length\) return false/);
  });

  it("safeKeyMatch returns false on null/undefined inputs", () => {
    expect(SRC).toMatch(/if \(!stored \|\| !candidate\) return false/);
  });

  it("includes the finding reference in a comment", () => {
    expect(SRC).toContain("Finding #323");
  });
});
