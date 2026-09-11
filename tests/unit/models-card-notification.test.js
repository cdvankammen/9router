/**
 * Regression test for GAP-P2-29: ModelsCard.js notification store usage.
 *
 * The 5 catch blocks in ModelsCard.js previously used console.log only,
 * making alias set/delete, custom model add/delete, and initial fetch
 * failures invisible to users.
 *
 * Fix: imported useNotificationStore and replaced console.log with
 * notify.error() in all 5 catch blocks.
 *
 * Tests:
 *  1. Positive: source file imports useNotificationStore and calls notify.error
 *  2. Anti-false-positive: source-level guard that catches re-introduction
 *     of console.log catch blocks.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_PATH = resolve(
  import.meta.dirname,
  "../../src/app/(dashboard)/dashboard/providers/components/ModelsCard.js",
);
const src = readFileSync(SRC_PATH, "utf-8");

describe("ModelsCard.js: notification store (GAP-P2-29)", () => {
  it("imports useNotificationStore from @/store/notificationStore", () => {
    expect(src).toContain(
      'import { useNotificationStore } from "@/store/notificationStore"',
    );
  });

  it("initializes notify = useNotificationStore() in the component", () => {
    expect(src).toMatch(/const\s+notify\s*=\s*useNotificationStore\(\)/);
  });

  it("has notify.error in catch blocks (not silent console.log)", () => {
    // All 5 catch blocks should contain notify.error — this regex counts occurrences.
    const matches = [...src.matchAll(/notify\.error\(/g)];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("no catch block uses only console.log (anti-false-positive)", () => {
    // Should NOT find catch blocks with only console.log and no notify.error
    // Pattern: } catch (e) { console.log("..., but no notify.error on the next ~200 chars
    const catchBlocks = [...src.matchAll(/\} catch \(e\) \{[^}]*console\.log[^}]*\}/g)];
    expect(catchBlocks).toHaveLength(0);
  });

  it("notify.error messages are user-friendly (contain descriptive text)", () => {
    const errorMessages = [...src.matchAll(/notify\.error\(([^)]*)\)/g)];
    expect(errorMessages.length).toBeGreaterThanOrEqual(5);
    // Each error message should contain user-facing text (not raw error objects)
    for (const [, msg] of errorMessages) {
      expect(msg).toMatch(/Failed to/);
    }
  });
});
