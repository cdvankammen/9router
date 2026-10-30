// Security hardening test for finding #289: root custom-server.js must wire
// the rate-limiter module the same way cli/app/custom-server.js does. The
// CLI variant already enforces a per-IP sliding-window budget at the TCP
// layer; the root custom-server.js (used by `npm start` / standalone builds)
// previously left /v1/* and dashboard endpoints with no TCP-layer budget.
//
// This test pins the wiring invariant at the source level so a future
// refactor cannot silently drop the checkLimit call.
import { describe, expect, it } from "vitest";
import fs from "fs";

describe("Finding #289: root custom-server.js wires rate-limiter", () => {
  it("imports checkLimit from ./custom-server.rate-limiter", () => {
    const src = fs.readFileSync(
      new URL("../../custom-server.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(
      /require\s*\(\s*["']\.\/custom-server\.rate-limiter["']\s*\)/
    );
    expect(src).toMatch(/\bcheckLimit\b/);
  });

  it("calls checkLimit(ip, req.url, req.method) inside the wrapped handler", () => {
    const src = fs.readFileSync(
      new URL("../../custom-server.js", import.meta.url),
      "utf8"
    );
    // The call must use the unspoofable `ip` from the TCP socket (already
    // computed higher in the wrapped handler), not req.headers or any
    // client-supplied value.
    expect(src).toMatch(/checkLimit\s*\(\s*ip\s*,\s*req\.url\s*,\s*req\.method\s*\)/);
  });

  it("responds 429 + Retry-After when the budget is exhausted", () => {
    const src = fs.readFileSync(
      new URL("../../custom-server.js", import.meta.url),
      "utf8"
    );
    // The 429 response must fire BEFORE handler(req, res) is invoked —
    // otherwise the rate limit is advisory only.
    expect(src).toMatch(/res\.writeHead\s*\(\s*429/);
    expect(src).toMatch(/["']Retry-After["']/);
    // The short-circuit return must exist so handler() is never called when
    // allowed is false.
    expect(src).toMatch(/if\s*\(\s*!rl\.allowed\s*\)/);
  });

  it("mirrors the CLI variant's wiring (same module, same response shape)", () => {
    const rootSrc = fs.readFileSync(
      new URL("../../custom-server.js", import.meta.url),
      "utf8"
    );
    const cliSrc = fs.readFileSync(
      new URL("../../cli/app/custom-server.js", import.meta.url),
      "utf8"
    );
    // Both must import from the same rate-limiter module name (the CLI path
    // is relative to cli/app/ but resolves to the same file).
    expect(rootSrc).toMatch(/custom-server\.rate-limiter/);
    expect(cliSrc).toMatch(/custom-server\.rate-limiter/);
    // Both must use the same response shape (429 + Retry-After header).
    expect(rootSrc).toMatch(/["']Retry-After["']/);
    expect(cliSrc).toMatch(/["']Retry-After["']/);
  });
});
