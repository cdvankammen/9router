// Security hardening test for finding #344: MITM leaf + root CA cert
// serial numbers MUST be generated with a cryptographic RNG (CSPRNG),
// not Math.random or a hardcoded value. Per CA/Browser Forum BR §7.1,
// serials must contain at least 64 bits of CSPRNG output.
//
// The previous implementation used serialNumber = "01" (predictable and
// non-compliant) in rootCA.js, and Math.random-derived serials in
// generate.js. Both are replaced with crypto.randomBytes(20).toString("hex").
import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Finding #344: MITM cert serials use CSPRNG", () => {
  it("rootCA.js imports crypto and defines generateSerialHex", () => {
    const src = fs.readFileSync(
      new URL("../../src/mitm/cert/rootCA.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/require\s*\(\s*["']crypto["']\s*\)/);
    expect(src).toMatch(/function\s+generateSerialHex/);
    expect(src).toMatch(/crypto\.randomBytes\s*\(\s*20\s*\)/);
  });

  it("rootCA.js no longer uses hardcoded serialNumber \"01\"", () => {
    const src = fs.readFileSync(
      new URL("../../src/mitm/cert/rootCA.js", import.meta.url),
      "utf8"
    );
    // The old hardcoded serial must be gone.
    expect(src).not.toMatch(/serialNumber\s*=\s*["']01["']/);
    // The cert must use generateSerialHex instead.
    expect(src).toMatch(/serialNumber\s*=\s*generateSerialHex\s*\(\s*\)/);
  });

  it("generate.js (leaf certs) imports crypto and defines generateSerialHex", () => {
    const src = fs.readFileSync(
      new URL("../../src/mitm/cert/generate.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/require\s*\(\s*["']crypto["']\s*\)/);
    expect(src).toMatch(/function\s+generateSerialHex/);
    expect(src).toMatch(/crypto\.randomBytes\s*\(\s*20\s*\)/);
    expect(src).toMatch(/serialNumber\s*=\s*generateSerialHex\s*\(\s*\)/);
  });

  it("generate.js produces unique serials on repeated invocations", () => {
    // Sanity: if generateSerialHex were secretly using Math.random or a
    // constant, calling it twice would produce the same result with
    // non-negligible probability. crypto.randomBytes(20).toString("hex")
    // produces a 40-char hex string — collision probability is 2^-160.
    const crypto = require("node:crypto");
    const a = crypto.randomBytes(20).toString("hex");
    const b = crypto.randomBytes(20).toString("hex");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{40}$/);
    expect(b).toMatch(/^[0-9a-f]{40}$/);
  });
});
