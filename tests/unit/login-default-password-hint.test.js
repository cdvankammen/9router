// Security hardening test for finding #293: login page default-password hint
// The login page must NOT unconditionally advertise "Default password is
// 123456" — after password rotation the hint is a lie, and when the operator
// pins INITIAL_PASSWORD the stock default is wrong. The hint must be gated on
// both hasPassword===false AND initialPasswordSet===false.
import { describe, expect, it } from "vitest";
import fs from "fs";

describe("Finding #293: login page default-password hint is gated", () => {
  it("login page reads initialPasswordSet from /api/auth/status", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/login/page.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/setInitialPasswordSet\s*\(\s*data\.initialPasswordSet/);
    expect(src).toMatch(/useState\s*\(\s*false\s*\)/);
  });

  it("the '123456' hint is wrapped in a hasPassword===false && initialPasswordSet===false guard", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/login/page.js", import.meta.url),
      "utf8"
    );
    // The compound guard must precede the 123456 code tag in the source,
    // within a reasonable distance (same JSX block, not unrelated code
    // elsewhere in the file). Using source-position comparison instead of
    // a character-window regex so comment-block edits don't break the test.
    const guardIdx = src.indexOf("hasPassword === false && initialPasswordSet === false");
    const hintIdx = src.indexOf(">123456</code>");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(hintIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(hintIdx);
    // Tight enough to prove they're in the same JSX block (a bare hint
    // elsewhere in the file would be thousands of chars away).
    expect(hintIdx - guardIdx).toBeLessThan(1000);
  });

  it("/api/auth/status exposes initialPasswordSet mirroring INITIAL_PASSWORD env", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/api/auth/status/route.js", import.meta.url),
      "utf8"
    );
    // Both the success and catch branches must emit the field.
    const occurrences = (src.match(/initialPasswordSet\s*:\s*!!process\.env\.INITIAL_PASSWORD/g) || []).length;
    expect(occurrences).toBe(2);
  });

  it("every 123456 hint is inside a JSX conditional (not a bare paragraph)", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/login/page.js", import.meta.url),
      "utf8"
    );
    // Old (broken) rendering was a bare paragraph with no enclosing guard:
    //   <p className="...">Default password is <code>123456</code></p>
    // After the fix, every `123456` in the source must be preceded (within
    // 1000 chars — generous enough to span any comment block) by the
    // compound guard. A bare rendering would have no guard in that window.
    const re = /123456/g;
    let m;
    let count = 0;
    while ((m = re.exec(src)) !== null) {
      count++;
      const before = src.slice(Math.max(0, m.index - 1000), m.index);
      expect(before).toMatch(/hasPassword === false && initialPasswordSet === false/);
    }
    expect(count).toBeGreaterThan(0);
  });
});
