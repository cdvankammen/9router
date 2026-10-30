// Security hardening test for finding #327: tunnel shortId MUST use
// a CSPRNG. shortId forms part of the public tunnel URL
// (https://r<shortId>.abc-tunnel.us), so predictable values let an
// attacker enumerate/hijack active tunnels.
import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Finding #327: tunnel shortId uses CSPRNG", () => {
  it("state.js imports node:crypto", () => {
    const src = fs.readFileSync(
      new URL("../../src/lib/tunnel/shared/state.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/import\s+crypto\s+from\s+["']node:crypto["']/);
  });

  it("state.js uses crypto.randomBytes in generateShortId", () => {
    const src = fs.readFileSync(
      new URL("../../src/lib/tunnel/shared/state.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/function\s+generateShortId\s*\(\s*\)[\s\S]*?crypto\.randomBytes/);
    // Check for actual function calls, not just the string in comments
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });

  it("state.js has SECURITY comment documenting the finding", () => {
    const src = fs.readFileSync(
      new URL("../../src/lib/tunnel/shared/state.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#327/);
  });
});
