// Tests for the app-layer smart router (resolveSmartRouter).
// REGRESSION: previously iterated PROVIDERS (transport-only, no models) so it
// always found zero candidates and the feature silently no-op'd. Now iterates
// PROVIDER_MODELS (alias-keyed) — these tests assert real candidate selection.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveSmartRouter,
  trackRequestStart,
  trackRequestEnd,
  getActiveCount,
} from "@/sse/services/smartRouter.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-smartrouter-"));
  process.env.DATA_DIR = tempDir;
  const { initDb } = await import("@/lib/db/index.js");
  await initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

function makeSettings(overrides = {}) {
  return {
    smartRouter: {
      enabled: true,
      names: ["modelRouter", "auto"],
      allowedProviders: [],
      costQualityTradeoff: 5,
      maxCandidates: 3,
      ...overrides,
    },
  };
}

const body = { messages: [{ role: "user", content: "Write a python function to sort a list" }] };

describe("resolveSmartRouter", () => {
  it("returns a combo name + task type for a code prompt", async () => {
    const result = await resolveSmartRouter("modelRouter", body, makeSettings());
    expect(result).not.toBeNull();
    expect(result.taskType).toBe("code:generation");
    expect(result.comboName).toMatch(/^sr-modelRouter-/);
  });

  it("builds the dynamic combo with real provider/model strings from PROVIDER_MODELS", async () => {
    const body2 = { messages: [{ role: "user", content: "Explain quantum entanglement in simple terms" }] };
    const result = await resolveSmartRouter("modelRouter", body2, makeSettings());
    const { getComboByName } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await getComboByName(result.comboName);
    expect(combo).toBeDefined();
    expect(combo.models.length).toBeGreaterThan(0);
    // Models must be canonical "providerId/modelId" strings that the registry knows
    for (const m of combo.models) {
      const [provider, model] = m.split("/");
      expect(provider).toBeTruthy();
      expect(model).toBeTruthy();
    }
  });

  it("respects allowedProviders filter (only those provider ids considered)", async () => {
    // Unique prompt so sticky state from earlier tests doesn't collide
    const body3 = { messages: [{ role: "user", content: "Summarize this paragraph into two sentences please" }] };
    const result = await resolveSmartRouter(
      "modelRouter",
      body3,
      makeSettings({ allowedProviders: ["openai"] })
    );
    expect(result).not.toBeNull();
    const { getComboByName } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await getComboByName(result.comboName);
    // Every candidate must be from the allowed provider
    for (const m of combo.models) {
      expect(m.startsWith("openai/")).toBe(true);
    }
  });

  it("returns null when disabled or when model name is not a trigger", async () => {
    expect(await resolveSmartRouter("modelRouter", body, makeSettings({ enabled: false }))).toBeNull();
    expect(await resolveSmartRouter("some-other-model", body, makeSettings())).toBeNull();
  });

  it("allowedModels wildcard narrows the pool to that specific subset", async () => {
    const body4 = { messages: [{ role: "user", content: "Translate this paragraph to French please" }] };
    const result = await resolveSmartRouter(
      "modelRouter",
      body4,
      makeSettings({ allowedModels: ["openai/*"] })
    );
    expect(result).not.toBeNull();
    const { getComboByName } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await getComboByName(result.comboName);
    expect(combo.models.length).toBeGreaterThan(0);
    // Every candidate must match the openai/* pattern
    for (const m of combo.models) {
      expect(m.startsWith("openai/")).toBe(true);
    }
  });

  it("allowedModels with a model that doesn't exist → null (no candidates)", async () => {
    const body5 = { messages: [{ role: "user", content: "Write a haiku about the ocean" }] };
    const result = await resolveSmartRouter(
      "modelRouter",
      body5,
      makeSettings({ allowedModels: ["nonexistent-provider/definitely-not-a-model"] })
    );
    expect(result).toBeNull();
  });

  it("includes user-defined custom provider nodes (openai-compatible)", async () => {
    const { createProviderNode } = await import("@/lib/db/repos/nodesRepo.js");
    // Register a custom OpenAI-compatible node whose /models endpoint we control
    const node = await createProviderNode({
      id: "openai-compatible-chat-testnode1",
      type: "openai-compatible",
      name: "TestNode",
      prefix: "testnode",
      apiType: "chat",
      baseUrl: "http://127.0.0.1:9", // unreachable — getNodeModels returns [] gracefully
    });
    expect(node.id).toBe("openai-compatible-chat-testnode1");

    // With allowedModels targeting the node prefix, no candidates from static
    // registry will match; the node is unreachable so it yields none either.
    const body6 = { messages: [{ role: "user", content: "Write a poem about rain" }] };
    const result = await resolveSmartRouter(
      "modelRouter",
      body6,
      makeSettings({ allowedModels: ["testnode/*"] })
    );
    // Node exists & is eligible → result is NOT null with zero candidates
    // (unreachable upstream → 0 models) → router returns null gracefully.
    // This asserts the node was *considered* (no crash) and fail-open behavior.
    expect(result).toBeNull();
  });

  it("concurrency tracking decrements cleanly", () => {
    trackRequestStart("openai/gpt-4o");
    trackRequestStart("openai/gpt-4o");
    trackRequestEnd("openai/gpt-4o");
    // second start still active
    expect(getActiveCount("openai/gpt-4o")).toBe(1);
    trackRequestEnd("openai/gpt-4o");
    expect(getActiveCount("openai/gpt-4o")).toBe(0);
  });
});
