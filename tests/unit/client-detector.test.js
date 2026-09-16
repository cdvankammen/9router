import { describe, it, expect } from "vitest";
import { detectClientTool, detectIDE } from "../../open-sse/utils/clientDetector.js";

describe("detectClientTool (M3 identity)", () => {
  it("detects aider via UA", () => {
    expect(detectClientTool({ "user-agent": "aider/0.60.0" })).toBe("aider");
  });

  it("detects cline via UA", () => {
    expect(detectClientTool({ "user-agent": "Cline/3.2.0" })).toBe("cline");
  });

  it("detects roo-code via UA (both spellings)", () => {
    expect(detectClientTool({ "user-agent": "Roo-Code/3.1.0" })).toBe("roo-code");
    expect(detectClientTool({ "user-agent": "roocode/3.1.0" })).toBe("roo-code");
  });

  it("detects windsurf via UA", () => {
    expect(detectClientTool({ "user-agent": "Windsurf/1.2.0" })).toBe("windsurf");
  });

  it("detects zed via UA", () => {
    expect(detectClientTool({ "user-agent": "Zed/0.150.0" })).toBe("zed");
  });

  it("detects warp via UA", () => {
    expect(detectClientTool({ "user-agent": "Warp/0.2024.09" })).toBe("warp");
  });

  it("detects continue via UA", () => {
    expect(detectClientTool({ "user-agent": "Continue/1.0.0" })).toBe("continue");
  });

  it("detects openrouter-sdk via UA", () => {
    expect(detectClientTool({ "user-agent": "openrouter-sdk/1.0.0" })).toBe("openrouter-sdk");
  });

  it("honors trusted x-9r-app header as fallback", () => {
    expect(detectClientTool({ "x-9r-app": "my-custom-tool" }, {})).toBe("my-custom-tool");
  });

  it("returns null for unknown UA", () => {
    expect(detectClientTool({ "user-agent": "Mozilla/5.0 (Macintosh)" })).toBeNull();
  });
});

describe("detectIDE (M3 identity)", () => {
  it("detects vscode", () => {
    expect(detectIDE("vscode/1.90.0")).toBe("vscode");
  });

  it("detects jetbrains", () => {
    expect(detectIDE("IntelliJ IDEA/2024.1")).toBe("jetbrains");
    expect(detectIDE("PyCharm/2024.1")).toBe("jetbrains");
  });

  it("detects neovim", () => {
    expect(detectIDE("neovim/0.10.0")).toBe("neovim");
  });

  it("detects zed", () => {
    expect(detectIDE("Zed/0.150.0")).toBe("zed");
  });

  it("detects warp", () => {
    expect(detectIDE("Warp/0.2024.09")).toBe("warp");
  });

  it("detects terminal for curl", () => {
    expect(detectIDE("curl/8.5.0")).toBe("terminal");
  });

  it("returns null for unknown UA", () => {
    expect(detectIDE("Mozilla/5.0 (Macintosh)")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(detectIDE("")).toBeNull();
    expect(detectIDE(undefined)).toBeNull();
  });
});