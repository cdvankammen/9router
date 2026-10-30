import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";

const mocks = vi.hoisted(() => ({
  execSync: vi.fn(() => { throw new Error("not found"); }),
  execFile: vi.fn(() => ({ toString: () => "[object Object]" })),
  execFileSync: vi.fn(() => Buffer.from(JSON.stringify([
    { name: "headroom-ai", version: "0.26.0" },
    { name: "tree-sitter", version: "0.25.0" },
  ]))),
}));

vi.mock("child_process", () => ({
  execSync: mocks.execSync,
  execFile: mocks.execFile,
  execFileSync: mocks.execFileSync,
}));

import { findPython310, getHeadroomStatus, getInstalledHeadroomExtras, isLoopbackHeadroomUrl } from "../../src/lib/headroom/detect.js";

// GAP-P2-19: headroom/python/npm detection is now filesystem-only (no `which`).
// Spy on fs.existsSync so tests can simulate binaries present at specific paths.
const fsExistsSyncSpy = vi.spyOn(fs, "existsSync");

afterEach(() => {
  vi.clearAllMocks();
  fsExistsSyncSpy.mockReset();
});

describe("headroom detect", () => {
  it("detects installed headroom version and extras from pip list", () => {
    const result = getInstalledHeadroomExtras("python3");

    expect(mocks.execFileSync).toHaveBeenCalledWith(
      "python3",
      ["-m", "pip", "list", "--format=json", "--disable-pip-version-check"],
      expect.objectContaining({ windowsHide: true, timeout: 8000 }),
    );
    expect(result).toEqual({
      installed: true,
      version: "0.26.0",
      extras: { code: true, ml: false },
    });
  });

  it("prefers the interpreter that actually has headroom-ai installed", () => {
    // GAP-P2-19: headroom must be in EXTRA_BINS (filesystem-only probing).
    // Place it in /opt/homebrew/bin (part of EXTRA_BINS on macOS) and put
    // the python next to it. The python is the only one that has headroom-ai.
    const headroomPath = "/opt/homebrew/bin/headroom";
    const binPython = "/opt/homebrew/bin/python3";
    fsExistsSyncSpy.mockImplementation((p) =>
      p === headroomPath || p === binPython
    );
    mocks.execFileSync.mockImplementation((py, args) => {
      if (args[0] === "--version") return Buffer.from("Python 3.13.0\n");
      if (args.join(" ") === "-m pip show headroom-ai") {
        if (py === binPython) return Buffer.from("Name: headroom-ai\nVersion: 0.26.0\n");
        throw new Error(`not installed in ${py}`);
      }
      if (args.join(" ").startsWith("-m pip list ")) return Buffer.from(JSON.stringify([]));
      throw new Error(`unexpected execFileSync: ${py} ${args.join(" ")}`);
    });

    expect(findPython310()).toBe(binPython);
  });

  it("keeps top-level installed flag true when extras are readable", async () => {
    global.fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    // GAP-P2-19: headroom + python must be in EXTRA_BINS (filesystem-only probing).
    const headroomPath = "/usr/local/bin/headroom";
    const pythonPath = "/usr/local/bin/python";
    fsExistsSyncSpy.mockImplementation((p) =>
      p === headroomPath || p === pythonPath
    );
    mocks.execFileSync.mockImplementation((py, args) => {
      if (args[0] === "--version") return Buffer.from("Python 3.13.0\n");
      if (py === pythonPath && args.join(" ") === "-m pip show headroom-ai") return Buffer.from("Name: headroom-ai\nVersion: 0.26.0\n");
      if (py === pythonPath && args.join(" ").startsWith("-m pip list ")) return Buffer.from(JSON.stringify([
        { name: "headroom-ai", version: "0.26.0" },
        { name: "tree-sitter", version: "0.25.0" },
      ]));
      throw new Error(`unexpected execFileSync: ${py} ${args.join(" ")}`);
    });

    const status = await getHeadroomStatus("http://localhost:8787");

    expect(status.installed).toBe(true);
    expect(status.version).toBe("0.26.0");
    expect(status.extras).toEqual({ code: true, ml: false });
  });

  it("treats a reachable external proxy as running without local CLI", async () => {
    global.fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    mocks.execSync.mockImplementation((cmd) => {
      if (String(cmd).includes("where") || String(cmd).includes("which")) throw new Error("not found");
      throw new Error("unexpected execSync");
    });
    mocks.execFileSync.mockImplementation(() => { throw new Error("pip unavailable"); });

    const status = await getHeadroomStatus("http://headroom:8787");

    expect(status.installed).toBe(false);
    expect(status.running).toBe(true);
    expect(status.localUrl).toBe(false);
    expect(status.canStart).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith("http://headroom:8787/health", expect.any(Object));
  });

  it("recognizes loopback URLs for managed local mode", () => {
    expect(isLoopbackHeadroomUrl("http://localhost:8787")).toBe(true);
    expect(isLoopbackHeadroomUrl("http://127.0.0.1:8787")).toBe(true);
    expect(isLoopbackHeadroomUrl("http://headroom:8787")).toBe(false);
    expect(isLoopbackHeadroomUrl("not-a-url")).toBe(false);
  });
});
