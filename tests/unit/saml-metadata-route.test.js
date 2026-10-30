// Security hardening test for finding #331: SAML metadata route URL construction
// The metadata route MUST use getSamlBaseUrl (which respects BASE_URL /
// NEXT_PUBLIC_BASE_URL) instead of `new URL(request.url).origin`. The raw
// URL.origin on a HOSTNAME=0.0.0.0 deployment produces
// `http://0.0.0.0:20128/api/auth/saml/acs` in the published metadata —
// unreachable from any network and discloses the bind address.
import { describe, expect, it } from "vitest";
import fs from "fs";

describe("Finding #331: SAML metadata route URL construction", () => {
  it("imports getSamlBaseUrl from @/lib/auth/saml", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/api/auth/saml/metadata/route.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*getSamlBaseUrl[^}]*\}\s+from\s+["']@\/lib\/auth\/saml["']/);
  });

  it("uses getSamlBaseUrl(request, settings) and has no raw request.url-origin in code", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/api/auth/saml/metadata/route.js", import.meta.url),
      "utf8"
    );
    // Must call getSamlBaseUrl with the request and settings
    expect(src).toMatch(/getSamlBaseUrl\s*\(\s*request\s*,\s*settings\s*\)/);
    // Must NOT use the raw request.url-origin pattern in code lines. Comment
    // lines are stripped first so the explanatory comment that names the old
    // pattern does not false-positive this assertion.
    const codeOnly = src
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/new\s+URL\s*\(\s*request\.url\s*\)\s*\.\s*origin/);
  });

  it("aligns with the start/acs routes that already use getSamlBaseUrl", () => {
    // Verify the invariant is consistent across all SAML routes
    const startSrc = fs.readFileSync(
      new URL("../../src/app/api/auth/saml/start/route.js", import.meta.url),
      "utf8"
    );
    const acsSrc = fs.readFileSync(
      new URL("../../src/app/api/auth/saml/acs/route.js", import.meta.url),
      "utf8"
    );
    const metaSrc = fs.readFileSync(
      new URL("../../src/app/api/auth/saml/metadata/route.js", import.meta.url),
      "utf8"
    );
    // All three routes import getSamlBaseUrl
    expect(startSrc).toMatch(/getSamlBaseUrl/);
    expect(acsSrc).toMatch(/getSamlBaseUrl/);
    expect(metaSrc).toMatch(/getSamlBaseUrl/);
  });
});
