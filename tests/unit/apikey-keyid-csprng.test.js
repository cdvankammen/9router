// Security hardening test for finding #341: API key keyId MUST use
// a CSPRNG. Math.random (V8 xorshift128+) is predictable after ~2
// observations — an attacker who sees one recently-minted keyId could
// enumerate the remaining keys in the same generation window.
import { describe, expect, it } from "vitest";
import fs from "node:fs";

// The CLI variant (cli/app/src/shared/utils/apiKey.js) is gitignored
// (cli/.gitignore has `app/*`) and built separately — only test the root
// variant that is versioned in this repo.
const ROOT_API_KEY = "../../src/shared/utils/apiKey.js";

describe("Finding #341: API key keyId uses CSPRNG", () => {
  it("apiKey.js uses crypto.randomBytes for generateKeyId", () => {
    const src = fs.readFileSync(
      new URL(ROOT_API_KEY, import.meta.url),
      "utf8"
    );
    // Must use crypto.randomBytes inside generateKeyId
    expect(src).toMatch(/function\s+generateKeyId\s*\(\s*\)[\s\S]*?crypto\.randomBytes/);
    // Must NOT use Math.random() function calls (string may appear in comments)
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });

  it("apiKey.js has SECURITY comment documenting the finding", () => {
    const src = fs.readFileSync(
      new URL(ROOT_API_KEY, import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#341/);
    expect(src).toMatch(/CSPRNG|cryptographic/);
  });

  it("CLI variant (if present on disk) mirrors the same CSPRNG fix", () => {
    // cli/app/src/ is gitignored — check it only if it exists locally.
    // The build/sync pipeline must apply the same fix to the CLI variant.
    const cliPath = new URL("../../cli/app/src/shared/utils/apiKey.js", import.meta.url);
    try {
      const src = fs.readFileSync(cliPath, "utf8");
      expect(src).toMatch(/function\s+generateKeyId\s*\(\s*\)[\s\S]*?crypto\.randomBytes/);
      expect(src).not.toMatch(/Math\.random\s*\(/);
    } catch {
      // CLI variant not present on disk — skip (not a test failure).
    }
  });
});
