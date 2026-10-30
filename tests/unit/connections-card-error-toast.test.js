/**
 * Anti-false-positive test for GAP-P2-28: ConnectionsCard catch blocks
 * must surface errors via useNotificationStore instead of console.log.
 *
 * Verifies:
 *  1. No `console.log` calls remain inside catch blocks in ConnectionsCard.js
 *  2. All catch blocks call `notify(` (the notification store hook)
 *  3. The useNotificationStore import is present
 *  4. The notify hook is wired in the component body
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "app",
  "(dashboard)",
  "dashboard",
  "providers",
  "components",
  "ConnectionsCard.js"
);

describe("GAP-P2-28: ConnectionsCard error toast coverage", () => {
  let source;

  beforeAll(() => {
    source = readFileSync(FILE_PATH, "utf-8");
  });

  it("has useNotificationStore import", () => {
    expect(source).toContain('import { useNotificationStore }');
    expect(source).toContain('@/store/notificationStore');
  });

  it("wires notify hook in ConnectionsCard component", () => {
    expect(source).toMatch(/const\s+notify\s*=\s*useNotificationStore/);
  });

  it("no console.log inside catch blocks", () => {
    // Find all catch blocks and verify none contain console.log
    const lines = source.split("\n");
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match inline catch blocks like: } catch (e) { console.log(...); }
      if (/catch\s*(\([^)]*\))?\s*\{/.test(line) && /console\.log/.test(line)) {
        violations.push({ line: i + 1, content: line.trim() });
      }
      // Also check next line after catch for multi-line catch blocks
      if (/catch\s*(\([^)]*\))?\s*\{\s*$/.test(line) && i + 1 < lines.length) {
        if (/console\.log/.test(lines[i + 1])) {
          violations.push({ line: i + 2, content: lines[i + 1].trim() });
        }
      }
    }

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  Line ${v.line}: ${v.content}`)
        .join("\n");
      throw new Error(
        `${violations.length} catch blocks still use console.log:\n${details}`
      );
    }
  });

  it("all catch blocks in handler functions call notify()", () => {
    // Extract the ConnectionsCard component body (after the export default)
    const componentStart = source.indexOf("export default function ConnectionsCard");
    expect(componentStart).toBeGreaterThan(0);

    const componentBody = source.slice(componentStart);

    // Count catch blocks in the component body
    const catchBlocks = componentBody.match(/catch\s*(\([^)]*\))?\s*\{/g) || [];
    expect(catchBlocks.length).toBeGreaterThanOrEqual(7);

    // Verify each catch block region contains notify(
    const lines = componentBody.split("\n");
    const missingNotify = [];

    for (let i = 0; i < lines.length; i++) {
      if (/catch\s*(\([^)]*\))?\s*\{/.test(lines[i])) {
        // Check this line and next 2 lines for notify( or notify.error/warning/success(
        const block = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
        if (!/notify(\.|\()/.test(block)) {
          missingNotify.push({ line: i + 1, content: lines[i].trim() });
        }
      }
    }

    if (missingNotify.length > 0) {
      const details = missingNotify
        .map((m) => `  Line ${m.line}: ${m.content}`)
        .join("\n");
      throw new Error(
        `${missingNotify.length} catch blocks missing notify() call:\n${details}`
      );
    }
  });

  it("anti-false-positive: test would fail if console.log was reintroduced", () => {
    // Simulate what the source would look like with a console.log regression
    const badSource = source.replace(
      /notify\.error\(`Failed to load connections: \$\{e\?\.message \|\| e\}`\)/,
      'console.log("fetch error:", e)'
    );

    // Run the same check logic against the bad source
    const lines = badSource.split("\n");
    let foundViolation = false;

    for (let i = 0; i < lines.length; i++) {
      if (/catch\s*(\([^)]*\))?\s*\{/.test(lines[i]) && /console\.log/.test(lines[i])) {
        foundViolation = true;
        break;
      }
    }

    expect(foundViolation).toBe(true);
  });
});
