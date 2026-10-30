// Security hardening test for finding #303: custom-server.js must strip
// all client-spoofable x-9r-* identity headers at the TCP-socket boundary.
// open-sse/utils/clientDetector.js trusts x-9r-app, x-9router-app,
// x-9r-user, x-9router-user, x-9r-session, x-9router-session to override
// detected clientTool/sourceApp/session. Without stripping at the edge,
// any LAN peer can forge telemetry identity AND trigger native-passthrough
// mode (#304) which skips translator sanitization.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Finding #303: custom-server strips all x-9r-* identity headers", () => {
  it("strips x-9r-app and x-9router-app", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../custom-server.js"),
      "utf8"
    );
    expect(src).toMatch(/delete\s+req\.headers\["x-9r-app"\]/);
    expect(src).toMatch(/delete\s+req\.headers\["x-9router-app"\]/);
  });

  it("strips x-9r-user and x-9router-user", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../custom-server.js"),
      "utf8"
    );
    expect(src).toMatch(/delete\s+req\.headers\["x-9r-user"\]/);
    expect(src).toMatch(/delete\s+req\.headers\["x-9router-user"\]/);
  });

  it("strips x-9r-session and x-9router-session", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../custom-server.js"),
      "utf8"
    );
    expect(src).toMatch(/delete\s+req\.headers\["x-9r-session"\]/);
    expect(src).toMatch(/delete\s+req\.headers\["x-9router-session"\]/);
  });

  it("has Finding #303 SECURITY comment documenting the rationale", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../custom-server.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#303/);
    expect(src).toMatch(/client-spoofable|x-9r-\*.*identity/i);
  });

  it("strip block appears BEFORE the re-stamp of x-9r-real-ip and x-9r-peer-token", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../custom-server.js"),
      "utf8"
    );
    // The strip of x-9r-app must come before the re-stamp of x-9r-real-ip.
    const stripIdx = src.indexOf('delete req.headers["x-9r-app"]');
    const restampIdx = src.indexOf('req.headers["x-9r-real-ip"] = ip');
    expect(stripIdx).toBeGreaterThan(-1);
    expect(restampIdx).toBeGreaterThan(-1);
    expect(stripIdx).toBeLessThan(restampIdx);
  });
});
