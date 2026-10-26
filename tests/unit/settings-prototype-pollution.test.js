import { describe, it, expect } from "vitest";

// Direct import of the deep-merge behavior via the public mergeWithDefaults
// export. This test exercises the prototype-pollution hardening added to
// deepMergeObject in src/lib/db/repos/settingsRepo.js — CONFIG_MERGE_KEYS
// (smartRouter, capacityAdapter, etc.) must not let attacker-supplied
// __proto__/constructor/prototype keys mutate the merged object's prototype
// link or pollute downstream Object.prototype.
import { mergeWithDefaults } from "@/lib/db/repos/settingsRepo.js";

describe("settingsRepo deepMergeObject — prototype-pollution hardening", () => {
  it("ignores __proto__ keys injected via nested CONFIG_MERGE_KEYS payload", () => {
    // Attacker sends a PATCH body with __proto__ nested inside smartRouter.
    // mergeWithDefaults simulates the read-side path (raw DB → merged view).
    const raw = {
      smartRouter: JSON.parse('{"__proto__":{"polluted":true},"enabled":true,"evil_key":"<script>alert(1)</script>"}'),
    };
    const merged = mergeWithDefaults(raw);

    // The merged object itself must not have the prototype polluted.
    expect(({}).polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();

    // smartRouter retains legitimate keys.
    expect(merged.smartRouter.enabled).toBe(true);

    // Arbitrary attacker keys persist (this is a separate concern — no
    // rendering sink in the dashboard, see 08-security-findings.md).
    expect(merged.smartRouter.evil_key).toBe("<script>alert(1)</script>");

    // __proto__ must NOT appear as an own key on the merged smartRouter —
    // the hardening skips it during merge.
    expect(Object.prototype.hasOwnProperty.call(merged.smartRouter, "__proto__")).toBe(false);
  });

  it("ignores constructor keys injected via nested CONFIG_MERGE_KEYS payload", () => {
    const raw = {
      capacityAdapter: JSON.parse('{"constructor":{"polluted":true},"vision":{"enabled":true}}'),
    };
    const merged = mergeWithDefaults(raw);

    // merged.capacityAdapter.constructor should be the default Object
    // constructor (inherited from prototype), not the attacker-supplied object.
    expect(merged.capacityAdapter.constructor).toBe(Object);
    expect(Object.prototype.polluted).toBeUndefined();

    // Legitimate nested keys preserved.
    expect(merged.capacityAdapter.vision.enabled).toBe(true);
  });

  it("ignores prototype keys injected via nested CONFIG_MERGE_KEYS payload", () => {
    const raw = {
      claudeCompat: JSON.parse('{"prototype":{"isAdmin":true},"enabled":true}'),
    };
    const merged = mergeWithDefaults(raw);

    expect(Object.prototype.isAdmin).toBeUndefined();
    expect(merged.claudeCompat.enabled).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(merged.claudeCompat, "prototype")).toBe(false);
  });

  it("does not pollute Object.prototype even when multiple pollution keys are sent", () => {
    const raw = {
      smartRouter: JSON.parse('{"__proto__":{"a":1},"constructor":{"b":2},"prototype":{"c":3}}'),
      capacityAdapter: JSON.parse('{"__proto__":{"d":4}}'),
      srComboCleanup: JSON.parse('{"constructor":{"e":5}}'),
    };
    mergeWithDefaults(raw);

    // None of the pollution keys should escape to Object.prototype.
    for (const k of ["a", "b", "c", "d", "e", "polluted", "isAdmin"]) {
      expect(Object.prototype[k]).toBeUndefined();
      expect(({})[k]).toBeUndefined();
    }
  });

  it("preserves normal deep-merge behavior for legitimate sibling keys", () => {
    // A partial PATCH of smartRouter.allowedModels must not reset the sibling
    // defaults (names, enabled, costQualityTradeoff, etc.).
    const raw = {
      smartRouter: { allowedModels: ["oc/gpt-4o"] },
    };
    const merged = mergeWithDefaults(raw);

    expect(merged.smartRouter.allowedModels).toEqual(["oc/gpt-4o"]);
    expect(merged.smartRouter.names).toEqual(["modelRouter"]);
    expect(merged.smartRouter.costQualityTradeoff).toBe(5);
    expect(merged.smartRouter.maxCandidates).toBe(3);
  });
});
