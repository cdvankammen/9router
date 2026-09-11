import { describe, it, expect } from "vitest";
import { parseModel, stripBetaMarker } from "../../open-sse/services/model.js";

describe("stripBetaMarker (#3690)", () => {
  it("strips [1m] trailing marker", () => {
    expect(stripBetaMarker("claude-sonnet-4[1m]")).toEqual({
      cleaned: "claude-sonnet-4",
      betaMarker: "1m",
    });
  });

  it("strips [200k] trailing marker", () => {
    expect(stripBetaMarker("claude-opus-4.8[200k]")).toEqual({
      cleaned: "claude-opus-4.8",
      betaMarker: "200k",
    });
  });

  it("normalizes marker to lowercase", () => {
    expect(stripBetaMarker("model[1M]")).toEqual({
      cleaned: "model",
      betaMarker: "1m",
    });
    expect(stripBetaMarker("model[200K]")).toEqual({
      cleaned: "model",
      betaMarker: "200k",
    });
  });

  it("returns betaMarker null when no marker present", () => {
    expect(stripBetaMarker("claude-sonnet-4")).toEqual({
      cleaned: "claude-sonnet-4",
      betaMarker: null,
    });
  });

  it("does NOT strip markers that are not at the end", () => {
    expect(stripBetaMarker("model[1m]-extra")).toEqual({
      cleaned: "model[1m]-extra",
      betaMarker: null,
    });
  });

  it("does NOT strip non-numeric markers", () => {
    expect(stripBetaMarker("model[beta]")).toEqual({
      cleaned: "model[beta]",
      betaMarker: null,
    });
  });

  it("does NOT strip markers without k/m suffix", () => {
    expect(stripBetaMarker("model[1000]")).toEqual({
      cleaned: "model[1000]",
      betaMarker: null,
    });
  });

  it("handles null/undefined/empty input", () => {
    expect(stripBetaMarker(null)).toEqual({ cleaned: null, betaMarker: null });
    expect(stripBetaMarker(undefined)).toEqual({ cleaned: undefined, betaMarker: null });
    expect(stripBetaMarker("")).toEqual({ cleaned: "", betaMarker: null });
  });
});

describe("parseModel with beta markers (#3690)", () => {
  it("strips [1m] from bare model name", () => {
    const result = parseModel("claude-sonnet-4[1m]");
    expect(result).toMatchObject({
      model: "claude-sonnet-4",
      isAlias: true,
      betaMarker: "1m",
    });
  });

  it("strips [1m] from provider/model format", () => {
    const result = parseModel("anthropic/claude-sonnet-4[1m]");
    expect(result).toMatchObject({
      provider: "anthropic",
      model: "claude-sonnet-4",
      isAlias: false,
      betaMarker: "1m",
    });
  });

  it("strips [200k] marker", () => {
    const result = parseModel("gpt-5[200k]");
    expect(result).toMatchObject({
      model: "gpt-5",
      betaMarker: "200k",
    });
  });

  it("passes null betaMarker when no marker", () => {
    const result = parseModel("dialTop");
    expect(result).toMatchObject({
      model: "dialTop",
      isAlias: true,
      betaMarker: null,
    });
  });

  it("returns null provider for empty input", () => {
    const result = parseModel(null);
    expect(result).toMatchObject({
      provider: null,
      model: null,
      betaMarker: null,
    });
  });
});
