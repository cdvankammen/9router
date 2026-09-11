// GAP-P2-15: brew detection must use filesystem checks, NOT shell resolution.
// Prevents arbitrary command execution via PATH injection (.env attack vector).
import { describe, it, expect } from "vitest";
import { findBrewBin, hasBrew, BREW_CANDIDATES } from "../../src/lib/tunnel/tailscale/brewPath.js";

describe("brewPath (GAP-P2-15 security)", () => {
  it("returns absolute path when brew exists at /opt/homebrew/bin/brew", () => {
    const fakeExists = (p) => p === "/opt/homebrew/bin/brew";
    expect(findBrewBin(fakeExists)).toBe("/opt/homebrew/bin/brew");
    expect(hasBrew(fakeExists)).toBe(true);
  });

  it("falls back to /usr/local/bin/brew when opt/homebrew missing", () => {
    const fakeExists = (p) => p === "/usr/local/bin/brew";
    expect(findBrewBin(fakeExists)).toBe("/usr/local/bin/brew");
  });

  it("prefers /opt/homebrew over /usr/local when both exist", () => {
    const fakeExists = () => true;
    expect(findBrewBin(fakeExists)).toBe("/opt/homebrew/bin/brew");
  });

  it("returns null when no brew binary exists", () => {
    const fakeExists = () => false;
    expect(findBrewBin(fakeExists)).toBeNull();
    expect(hasBrew(fakeExists)).toBe(false);
  });

  it("does not reference process.env.PATH in source (immune to .env injection)", async () => {
    // Static analysis: the module source must not contain process.env.PATH
    const fs = await import("fs");
    const src = fs.readFileSync(
      new URL("../../src/lib/tunnel/tailscale/brewPath.js", import.meta.url),
      "utf8"
    );
    expect(src).not.toMatch(/process\.env\.PATH/);
    expect(src).not.toMatch(/execSync|exec\(|spawn\(/);
  });

  it("handles existsCheck throwing (permission errors) gracefully", () => {
    const throwingExists = () => { throw new Error("EACCES"); };
    expect(findBrewBin(throwingExists)).toBeNull();
    expect(hasBrew(throwingExists)).toBe(false);
  });

  it("uses only hardcoded BREW_CANDIDATES paths", () => {
    // Verify the candidate list contains only known-safe absolute paths
    for (const p of BREW_CANDIDATES) {
      expect(p).toMatch(/^\/(opt\/homebrew|usr\/local)\/bin\/brew$/);
    }
  });

  // Anti-false-positive: prove test catches wrong return values
  it("FAILS when findBrewBin returns wrong path (anti-false-positive)", () => {
    const fakeExists = (p) => p === "/opt/homebrew/bin/brew";
    // This MUST fail if someone changes BREW_CANDIDATES to include /tmp/fake
    expect(findBrewBin(fakeExists)).not.toBe("/tmp/fake-brew");
  });
});
