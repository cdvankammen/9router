/**
 * Settings deep-merge behavior (src/lib/db/repos/settingsRepo.js).
 *
 * Verifies the hardening fix: PARTIAL nested updates must NOT shadow sibling
 * defaults. E.g. PATCH {smartRouter:{enabled:true}} must keep names,
 * allowedProviders, allowedModels, costQualityTradeoff, maxCandidates.
 */

import { describe, it, expect, beforeEach } from "vitest";

const TEST_DIR = "/tmp/9r-settings-deepmerge-" + Date.now();

describe("settingsRepo nested deep-merge", () => {
  beforeEach(() => {
    process.env.DATA_DIR = TEST_DIR;
  });

  it("partial smartRouter update keeps sibling defaults", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ smartRouter: { enabled: true } });
    const s = await getSettings();

    expect(s.smartRouter.enabled).toBe(true);
    expect(s.smartRouter.names).toEqual(["modelRouter"]);
    expect(s.smartRouter.allowedProviders).toEqual([]);
    expect(s.smartRouter.allowedModels).toEqual([]);
    expect(s.smartRouter.costQualityTradeoff).toBe(5);
    expect(s.smartRouter.maxCandidates).toBe(3);
  });

  it("partial capacityAdapter update keeps the other capability defaults", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ capacityAdapter: { vision: { enabled: false } } });
    const s = await getSettings();

    // vision updated
    expect(s.capacityAdapter.vision.enabled).toBe(false);
    expect(s.capacityAdapter.vision.models).toEqual([]);
    // siblings preserved
    expect(s.capacityAdapter.audioInput.enabled).toBe(true);
    expect(s.capacityAdapter.pdf.enabled).toBe(false);
    expect(s.capacityAdapter.videoInput.enabled).toBe(false);
  });

  it("partial srComboCleanup update keeps defaults", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ srComboCleanup: { enabled: true } });
    const s = await getSettings();

    expect(s.srComboCleanup.enabled).toBe(true);
    expect(s.srComboCleanup.ttlHours).toBe(24);
    expect(s.srComboCleanup.intervalHours).toBe(12);
  });

  it("modelFallbacks uses REPLACE semantics (UI sends full map; delete works)", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ modelFallbacks: { "openai/gpt-4o": ["openai/gpt-4o-mini"] } });
    // Delete: UI sends the map WITHOUT the key — must NOT resurrect it.
    await updateSettings({ modelFallbacks: { "anthropic/claude-sonnet-4.6": ["openai/gpt-4o"] } });
    const s = await getSettings();

    expect(s.modelFallbacks["openai/gpt-4o"]).toBeUndefined();
    expect(s.modelFallbacks["anthropic/claude-sonnet-4.6"]).toEqual(["openai/gpt-4o"]);
  });

  it("SEQUENTIAL partial PATCHes accumulate (no clobbering)", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    // PATCH 1: enable the router
    await updateSettings({ smartRouter: { enabled: true } });
    // PATCH 2: set allowedModels — must NOT reset enabled back to default false
    await updateSettings({ smartRouter: { allowedModels: ["dial/*"] } });
    const s = await getSettings();

    expect(s.smartRouter.enabled).toBe(true); // ← was false before the fix
    expect(s.smartRouter.allowedModels).toEqual(["dial/*"]);
    expect(s.smartRouter.names).toEqual(["modelRouter"]);
  });

  it("sequential capacityAdapter PATCHes accumulate per capability", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ capacityAdapter: { vision: { enabled: false } } });
    await updateSettings({ capacityAdapter: { vision: { roundRobin: true } } });
    const s = await getSettings();

    expect(s.capacityAdapter.vision.enabled).toBe(false);
    expect(s.capacityAdapter.vision.roundRobin).toBe(true);
  });

  it("explicit nested updates override defaults (full object replaces)", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({
      smartRouter: { enabled: true, names: ["my-router"], allowedModels: ["openai/*"], costQualityTradeoff: 8, maxCandidates: 5 },
    });
    const s = await getSettings();

    expect(s.smartRouter.names).toEqual(["my-router"]);
    expect(s.smartRouter.allowedModels).toEqual(["openai/*"]);
    expect(s.smartRouter.costQualityTradeoff).toBe(8);
    expect(s.smartRouter.maxCandidates).toBe(5);
  });

  it("legacy flat settings still round-trip (backward compat)", async () => {
    const { initDb, updateSettings, getSettings } = await import("@/lib/db/index.js");
    await initDb();

    await updateSettings({ cloudEnabled: true, markdownLogEnabled: true });
    const s = await getSettings();

    expect(s.cloudEnabled).toBe(true);
    expect(s.markdownLogEnabled).toBe(true);
  });
});
