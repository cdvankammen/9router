import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// GAP-P3-33 regression: writeSkipApprovals must return structured error
// (error + detail + code) for non-ENOENT read failures, not raw e.code.

describe("writeSkipApprovals structured error (GAP-P3-33)", () => {
  let tmpDir;
  let originalPlatform;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gap-p3-33-"));
    // Force getCandidateRoots to return our tmp dir on all platforms.
    originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    vi.resetModules();
  });

  afterEach(async () => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    } else {
      delete process.platform;
    }
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns structured error with detail and code on EACCES", async () => {
    const fakeError = new Error("permission denied");
    fakeError.code = "EACCES";
    vi.spyOn(fs, "readFile").mockRejectedValue(fakeError);
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);

    // Dynamic import after platform override so getCandidateRoots uses tmpDir.
    // We need to also mock os.homedir to point at tmpDir.
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    vi.resetModules();
    const mod = await import("../../src/app/api/cli-tools/cowork-settings/route.js");

    const result = await mod.writeSkipApprovals([{ name: "test-server" }]);

    expect(result).toBeDefined();
    expect(result.error).toBe("config_read_failed");
    expect(result.code).toBe("EACCES");
    expect(result.detail).toContain("permission denied");
    // Must NOT be a raw error code string (the old bug).
    expect(typeof result.error).toBe("string");
    expect(result.error).not.toBe("EACCES");
  });

  it("returns structured error on EBUSY / I/O errors", async () => {
    const fakeError = new Error("resource busy or locked");
    fakeError.code = "EBUSY";
    vi.spyOn(fs, "readFile").mockRejectedValue(fakeError);
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    vi.resetModules();
    const mod = await import("../../src/app/api/cli-tools/cowork-settings/route.js");

    const result = await mod.writeSkipApprovals([]);

    expect(result.error).toBe("config_read_failed");
    expect(result.code).toBe("EBUSY");
    expect(result.detail).toContain("resource busy");
  });

  it("does NOT return error on ENOENT (missing file is normal first-run)", async () => {
    const enoent = new Error("no such file");
    enoent.code = "ENOENT";
    vi.spyOn(fs, "readFile").mockRejectedValue(enoent);
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    vi.resetModules();
    const mod = await import("../../src/app/api/cli-tools/cowork-settings/route.js");

    const result = await mod.writeSkipApprovals([{ name: "srv-a" }]);

    // ENOENT is swallowed — function proceeds to write fresh config.
    expect(result.error).toBeUndefined();
    expect(result.written).toBe(1);
  });

  it("anti-false-positive: assertion would break if raw e.code returned", async () => {
    const fakeError = new Error("disk full");
    fakeError.code = "ENOSPC";
    vi.spyOn(fs, "readFile").mockRejectedValue(fakeError);
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    vi.resetModules();
    const mod = await import("../../src/app/api/cli-tools/cowork-settings/route.js");

    const result = await mod.writeSkipApprovals([]);

    // This assertion WOULD FAIL if the code regressed to `return { error: e.code }`:
    // result.error would be "ENOSPC" instead of "config_read_failed".
    expect(result.error).toBe("config_read_failed");
    expect(result).toHaveProperty("detail");
    expect(result).toHaveProperty("code");
  });
});
