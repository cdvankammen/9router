/**
 * Regression test: Kilo free-models fetch timeout (GAP-P3-26)
 *
 * Verifies that the Kilo API fetch in GET() uses AbortSignal.timeout(),
 * bounding the provider setup page even if Kilo's API hangs.
 *
 * Background: the gap scanner flagged "no timeout" at line 19.
 * The signal: AbortSignal.timeout(10000) is present in the original
 * commit (8640503b, 2026-03-31) — this is a false positive.
 * The test locks the behavior so the guard cannot be silently removed.
 *
 * Anti-false-positive verified: intentionally removing the signal property
 * from route.js makes the source-invariant assertion fail; restoring passes.
 *
 * Run: cd tests && NODE_PATH=/tmp/node_modules node_modules/.bin/vitest run \
 *   unit/kilo-free-models-fetch-timeout-gapp326.test.js --reporter=verbose
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routeSrc = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/api/providers/kilo/free-models/route.js"),
  "utf8",
);

describe("GAP-P3-26: Kilo free-models fetch timeout guard", () => {
  it("route.js contains AbortSignal.timeout on the Kilo fetch", () => {
    expect(routeSrc).toMatch(/signal\s*:\s*AbortSignal\.timeout\(\d+\)/);
  });

  it("timeout is 10 000 ms (10 s)", () => {
    expect(routeSrc).toMatch(/AbortSignal\.timeout\(\s*10000\s*\)/);
  });

  it("signal is on the same fetch() call that uses KILO_MODELS_URL", () => {
    // Verify the signal sits within the fetch call to KILO_MODELS_URL
    const fetchBlock = routeSrc.match(
      /fetch\s*\(\s*KILO_MODELS_URL[\s\S]*?\)/,
    );
    expect(fetchBlock).not.toBeNull();
    expect(fetchBlock[0]).toMatch(/signal\s*:\s*AbortSignal\.timeout\(\d+\)/);
  });
});
