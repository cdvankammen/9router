import { describe, expect, it } from "vitest";
import {
  LEGITIMATE_SERVICES_LINUX,
  LEGITIMATE_SERVICES_WIN,
  LEGITIMATE_SERVICES_ALL,
} from "../../src/shared/constants/legitimateServices.js";

describe("LEGITIMATE_SERVICES constants", () => {
  it("exports non-empty arrays for all platforms", () => {
    expect(LEGITIMATE_SERVICES_LINUX.length).toBeGreaterThan(0);
    expect(LEGITIMATE_SERVICES_WIN.length).toBeGreaterThan(0);
    expect(LEGITIMATE_SERVICES_ALL.length).toBeGreaterThan(0);
  });

  it("ALL is the union of LINUX and WIN (no duplicates)", () => {
    const union = new Set([...LEGITIMATE_SERVICES_LINUX, ...LEGITIMATE_SERVICES_WIN]);
    expect(LEGITIMATE_SERVICES_ALL.sort()).toEqual([...union].sort());
  });

  it("LINUX includes lighttpd but not w3svc/iisexpress", () => {
    expect(LEGITIMATE_SERVICES_LINUX).toContain("lighttpd");
    expect(LEGITIMATE_SERVICES_LINUX).not.toContain("w3svc");
    expect(LEGITIMATE_SERVICES_LINUX).not.toContain("iisexpress");
  });

  it("WIN includes w3svc and iisexpress but not lighttpd", () => {
    expect(LEGITIMATE_SERVICES_WIN).toContain("w3svc");
    expect(LEGITIMATE_SERVICES_WIN).toContain("iisexpress");
    expect(LEGITIMATE_SERVICES_WIN).not.toContain("lighttpd");
  });

  it("common services present in both lists", () => {
    const common = ["nginx", "caddy", "httpd", "haproxy", "traefik"];
    for (const svc of common) {
      expect(LEGITIMATE_SERVICES_LINUX).toContain(svc);
      expect(LEGITIMATE_SERVICES_WIN).toContain(svc);
    }
  });

  it("all entries are lowercase strings", () => {
    for (const list of [LEGITIMATE_SERVICES_LINUX, LEGITIMATE_SERVICES_WIN, LEGITIMATE_SERVICES_ALL]) {
      for (const entry of list) {
        expect(typeof entry).toBe("string");
        expect(entry).toBe(entry.toLowerCase());
      }
    }
  });
});
