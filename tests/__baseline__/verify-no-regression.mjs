// Gate: so kết quả test hiện tại với baseline known-fails.
// PASS nếu KHÔNG có test nào pass(baseline) → fail(now). Test mới được phép.
// Usage: node tests/__baseline__/verify-no-regression.mjs <current-results.json>
import { readFileSync } from "fs";

const knownFails = new Set(
  readFileSync(new URL("./known-fails.txt", import.meta.url), "utf8")
    .split("\n").map(s => s.trim()).filter(Boolean)
);

const resultsPath = process.argv[2];
if (!resultsPath) { console.error("Missing results.json path"); process.exit(2); }

const r = JSON.parse(readFileSync(resultsPath, "utf8"));
// Strip absolute prefix to get "tests/..." relative path.
// Handles both "/Users/.../tests/x.js" and legacy "/.../app/tests/x.js" layouts.
const relPath = (abs) => {
  const m = abs.match(/(?:^|\/)tests\/(.+)$/);
  return m ? "tests/" + m[1] : abs;
};
const nowFails = r.testResults.flatMap(f => {
  const rel = relPath(f.name);
  const failedTests = (f.assertionResults || []).filter(a => a.status === "failed");
  // Suite-load failure: status=failed but no assertion results recorded.
  if (failedTests.length === 0 && f.status === "failed") {
    return [rel + " :: <suite failed to load>"];
  }
  return failedTests.map(a => rel + " :: " + a.fullName);
});

// Regression = fail bây giờ NHƯNG không có trong baseline known-fails
const regressions = nowFails.filter(f => !knownFails.has(f));

if (regressions.length) {
  console.error(`\n❌ REGRESSION: ${regressions.length} test pass→fail:\n`);
  regressions.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log(`✅ No regression. (now fails=${nowFails.length}, baseline known=${knownFails.size}, all known)`);
