// Guards the client-side mirror of POST /api/providers validity check.
// isAddableViaApiKey must accept exactly the providers the server accepts,
// and getProviderAddBlockReason must produce a targeted message for every
// provider the server would refuse with an opaque "Invalid provider".
import { describe, it, expect } from "vitest";
import {
  isAddableViaApiKey,
  getProviderAddBlockReason,
  APIKEY_PROVIDERS,
  FREE_TIER_PROVIDERS,
  FREE_PROVIDERS,
  OAUTH_PROVIDERS,
  AI_PROVIDERS,
} from "../../src/shared/constants/providers.js";

describe("isAddableViaApiKey", () => {
  it("accepts a category-apikey provider (azure)", () => {
    expect(APIKEY_PROVIDERS.azure).toBeTruthy();
    expect(isAddableViaApiKey("azure")).toBe(true);
  });

  it("accepts a category-freeTier provider (gemini)", () => {
    expect(FREE_TIER_PROVIDERS.gemini).toBeTruthy();
    expect(isAddableViaApiKey("gemini")).toBe(true);
  });

  it("accepts a category-webCookie provider (grok-web)", () => {
    expect(isAddableViaApiKey("grok-web")).toBe(true);
  });

  it("accepts a dual-auth oauth provider whose authModes includes apikey (codebuddy-cn)", () => {
    // category "oauth" but authModes: ["oauth","apikey"]
    expect(OAUTH_PROVIDERS["codebuddy-cn"]).toBeTruthy();
    expect(AI_PROVIDERS["codebuddy-cn"].authModes).toContain("apikey");
    expect(isAddableViaApiKey("codebuddy-cn")).toBe(true);
  });

  it("accepts openai-compatible prefixed ids", () => {
    expect(isAddableViaApiKey("openai-compatible-my-proxy")).toBe(true);
  });

  it("accepts anthropic-compatible prefixed ids", () => {
    expect(isAddableViaApiKey("anthropic-compatible-my-proxy")).toBe(true);
  });

  it("accepts custom-embedding prefixed ids", () => {
    expect(isAddableViaApiKey("custom-embedding-my-vec")).toBe(true);
  });

  it("rejects an OAuth-only provider (claude)", () => {
    expect(OAUTH_PROVIDERS.claude).toBeTruthy();
    expect(isAddableViaApiKey("claude")).toBe(false);
  });

  it("rejects an OAuth-only provider (cursor)", () => {
    expect(OAUTH_PROVIDERS.cursor).toBeTruthy();
    expect(isAddableViaApiKey("cursor")).toBe(false);
  });

  it("rejects a category-free provider (kiro)", () => {
    expect(FREE_PROVIDERS.kiro).toBeTruthy();
    expect(isAddableViaApiKey("kiro")).toBe(false);
  });

  it("rejects empty / non-string ids", () => {
    expect(isAddableViaApiKey("")).toBe(false);
    expect(isAddableViaApiKey(null)).toBe(false);
    expect(isAddableViaApiKey(undefined)).toBe(false);
  });

  it("rejects unknown provider ids", () => {
    expect(isAddableViaApiKey("not-a-real-provider-xyz")).toBe(false);
  });
});

describe("getProviderAddBlockReason", () => {
  it("returns null for addable providers", () => {
    expect(getProviderAddBlockReason("azure")).toBeNull();
    expect(getProviderAddBlockReason("gemini")).toBeNull();
    expect(getProviderAddBlockReason("codebuddy-cn")).toBeNull();
    expect(getProviderAddBlockReason("openai-compatible-x")).toBeNull();
  });

  it("returns an OAuth-only message for claude", () => {
    const reason = getProviderAddBlockReason("claude");
    expect(reason).toMatch(/OAuth-only/);
    expect(reason).toMatch(/Claude/);
  });

  it("returns an OAuth-only message for cursor", () => {
    const reason = getProviderAddBlockReason("cursor");
    expect(reason).toMatch(/OAuth-only/);
  });

  it("returns a free-provider message for kiro", () => {
    const reason = getProviderAddBlockReason("kiro");
    expect(reason).toMatch(/free provider/);
    expect(reason).toMatch(/Kiro/);
  });

  it("returns a generic unknown-provider message for unrecognized ids", () => {
    expect(getProviderAddBlockReason("nope-no-such-provider")).toBe("Unknown provider.");
  });
});
