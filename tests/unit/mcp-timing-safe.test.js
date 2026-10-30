// Security hardening test for finding #322: MCP routes used plain ===
// for CLI token comparison, leaking a timing side-channel. The canonical
// hasValidCliToken in @/lib/auth/requireAuth uses crypto.timingSafeEqual.
// The MCP routes duplicated the check locally instead of importing.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Finding #322: MCP routes use canonical timing-safe CLI token check", () => {
  it("SSE route imports hasValidCliToken from @/lib/auth/requireAuth", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/mcp/[plugin]/sse/route.js"),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*hasValidCliToken[^}]*\}\s+from\s+["']@\/lib\/auth\/requireAuth["']/);
    expect(src).toMatch(/Finding\s+#322/);
  });

  it("message route imports hasValidCliToken from @/lib/auth/requireAuth", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/mcp/[plugin]/message/route.js"),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*hasValidCliToken[^}]*\}\s+from\s+["']@\/lib\/auth\/requireAuth["']/);
    expect(src).toMatch(/Finding\s+#322/);
  });

  it("MCP routes do NOT define their own hasValidCliToken (no duplicate === comparison)", () => {
    const sseSrc = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/mcp/[plugin]/sse/route.js"),
      "utf8"
    );
    const msgSrc = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/mcp/[plugin]/message/route.js"),
      "utf8"
    );
    // Neither file should define its own hasValidCliToken function.
    expect(sseSrc).not.toMatch(/function\s+hasValidCliToken/);
    expect(sseSrc).not.toMatch(/async\s+function\s+hasValidCliToken/);
    expect(msgSrc).not.toMatch(/function\s+hasValidCliToken/);
    expect(msgSrc).not.toMatch(/async\s+function\s+hasValidCliToken/);
  });

  it("canonical hasValidCliToken uses crypto.timingSafeEqual", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/lib/auth/requireAuth.js"),
      "utf8"
    );
    // The canonical implementation must use timingSafeEqual.
    expect(src).toMatch(/crypto\.timingSafeEqual/);
    expect(src).toMatch(/export\s+async\s+function\s+hasValidCliToken/);
  });
});
