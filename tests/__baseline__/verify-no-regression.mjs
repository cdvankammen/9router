// Regression gate: compare current test results against the known-fails baseline.
// PASS iff NO currently-failing test is missing from known-fails.txt (i.e. no NEW
// failures). Known entries that currently PASS are reported as "stale"
// (known-now-passing) — informational only, not a gate.
//
// MATCHING RULE (this repo, layout-agnostic):
//   Vitest's JSON reporter emits absolute file paths that depend on the checkout
//   location (upstream: /Users/Working/router4/app/tests/... ; here:
//   /Users/.../9router/tests/...). The old split("/app/")[1] trick only worked for
//   the upstream layout and yields "undefined :: <name>" keys everywhere else.
//
//   known-fails.txt entries look like:
//       tests/unit/rtk.test.js :: compressMessages (enabled) compresses ...
//   i.e. "<tests-relative-file> :: <full test name>".
//
//   A failure is KNOWN iff BOTH:
//     - the entry's file part ("tests/unit/rtk.test.js") is a SUBSTRING of the
//       failure's absolute file path — works regardless of checkout prefix, and
//     - the entry's test-name part is a SUBSTRING of the failure's fullName
//       (vitest emits fullName = ancestorTitles.join(" ") + " " + title).
//   The test-name match is exact substring, not prefix, so entries survive
//   renames and re-wording. A test-name-less entry (just a file) matches any
//   failure in that file.
//
//   Stale detection: a known entry is stale iff it matches NO current failure.
//
// Usage: node tests/__baseline__/verify-no-regression.mjs <current-results.json>
// Exit codes: 0 = no NEW failures; 1 = at least one NEW failure; 2 = bad usage/input.
import { readFileSync } from "fs";

const knownEntries = readFileSync(new URL("./known-fails.txt", import.meta.url), "utf8")
  .split("\n").map(s => s.trim()).filter(Boolean);

// Normalize a known-fails entry into { file, testName } (both used as substrings).
function parseKnownEntry(entry) {
  const sep = entry.indexOf(" :: ");
  if (sep === -1) return { file: entry, testName: "" };
  return { file: entry.slice(0, sep), testName: entry.slice(sep + 4) };
}

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error("Missing results.json path");
  console.error("Usage: node tests/__baseline__/verify-no-regression.mjs <current-results.json>");
  process.exit(2);
}

let r;
try {
  r = JSON.parse(readFileSync(resultsPath, "utf8"));
} catch (e) {
  console.error(`Cannot read/parse ${resultsPath}: ${e.message}`);
  process.exit(2);
}

// Accept both shapes: legacy vitest reporter object ({ testResults: [...] })
// and the newer array form.
const testResults = Array.isArray(r) ? r : r.testResults;

// Collect every failing assertion as { file, fullName }.
const nowFails = (testResults || []).flatMap(f =>
  (f.assertionResults || [])
    .filter(a => a.status === "failed")
    .map(a => ({
      file: f.name,
      fullName: a.fullName || [...(a.ancestorTitles || []), a.title].join(" "),
    }))
);

const knownParsed = knownEntries.map(parseKnownEntry);

function matches(entry, fail) {
  return entry.file !== "" && fail.file.includes(entry.file) &&
    (entry.testName === "" || fail.fullName.includes(entry.testName));
}

const isKnown = fail => knownParsed.some(entry => matches(entry, fail));

const newFails = nowFails.filter(f => !isKnown(f));
const staleKnown = knownParsed.filter(entry => !nowFails.some(f => matches(entry, f)));
const knownStillFailing = nowFails.length - newFails.length;

// Strip the checkout prefix for readable output: "tests/unit/foo.test.js".
function relFile(absPath) {
  const idx = absPath.lastIndexOf("/tests/");
  if (idx !== -1) return absPath.slice(idx + 1);
  return absPath.split("/").pop();
}

console.log("\nRegression gate report");
console.log(`  now failing:          ${nowFails.length}`);
console.log(`  known (still fail):   ${knownStillFailing}`);
console.log(`  stale (now pass):     ${staleKnown.length} of ${knownParsed.length} known entries`);
console.log(`  NEW failures:         ${newFails.length}`);

if (staleKnown.length) {
  console.log(`\nℹ️  Stale known-fails entries (catalogued but currently passing):`);
  staleKnown.forEach(k => console.log(`  - ${k.file} :: ${k.testName}`));
}

if (newFails.length) {
  console.error(`\n❌ ${newFails.length} NEW failure(s) not in known-fails.txt:`);
  newFails.forEach(f => console.error(`  - ${relFile(f.file)} :: ${f.fullName}`));
  console.error("\nThese are real regressions or missing known-fails entries.");
  process.exit(1);
}

console.log(`\n✅ No new failures. (known entries: ${knownParsed.length}, stale: ${staleKnown.length})`);
process.exit(0);
