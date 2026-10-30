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
    // The unconditional rendering pattern must NOT exist.
    // Old (broken): a bare <p> containing "123456" with no surrounding condition.
    // We check that every occurrence of "123456" in the JSX is inside a block
    // that references both hasPassword and initialPasswordSet.
    const lines = src.split("\n");
    const hintLineIdx = lines.findIndex((l) => l.includes("123456") && l.includes("<code"));
    expect(hintLineIdx).toBeGreaterThan(-1);
    // Walk backwards from the hint line to find the enclosing JSX condition.
    const preceding = lines.slice(Math.max(0, hintLineIdx - 6), hintLineIdx).join("\n");
    expect(preceding).toMatch(/hasPassword\s*===\s*false/);
    expect(preceding).toMatch(/initialPasswordSet\s*===\s*false/);
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

  it("the unconditional hint rendering is gone (no bare 123456 paragraph)", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/login/page.js", import.meta.url),
      "utf8"
    );
    // The old unconditional pattern was:
    //   <p ...>Default password is <code ...>123456</code></p>
    // with no surrounding JSX expression. After the fix, every 123456 is
    // inside a conditional, so a bare <p ...>Default password is on the line
    // immediately before 123456 must NOT appear.
    const barePattern = /<p[^>]*>\s*Default password is\s*<code[^>]*>123456<\/code>\s*<\/p>/;
    expect(src).not.toMatch(barePattern);
  });
});
