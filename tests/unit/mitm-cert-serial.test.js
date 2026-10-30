// Security hardening test for finding #344: MITM cert serial numbers
// MUST be generated with a CSPRNG, not Math.random or a hardcoded value.
// Per CA/Browser Forum BR §7.1, serials must contain at least 64 bits
// of CSPRNG output. Both the root CA and leaf cert generators live in
// src/mitm/cert/rootCA.js.
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
    expect(src).not.toMatch(/serialNumber\s*=\s*["']01["']/);
  });

  it("rootCA.js no longer uses Math.random() for serials", () => {
    const src = fs.readFileSync(
      new URL("../../src/mitm/cert/rootCA.js", import.meta.url),
      "utf8"
    );
    // Check for actual function calls, not just the string in comments
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });

  it("rootCA.js uses generateSerialHex() for both root CA and leaf serials", () => {
    const src = fs.readFileSync(
      new URL("../../src/mitm/cert/rootCA.js", import.meta.url),
      "utf8"
    );
    const matches = src.match(/serialNumber\s*=\s*generateSerialHex\s*\(\s*\)/g);
    expect(matches).not.toBeNull();
    // Must appear twice: once for root CA, once for leaf cert
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
