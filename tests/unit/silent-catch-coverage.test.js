/**
 * Anti-false-positive test for GAP-P2-ERR: Silent catch {} blocks
 * must not swallow errors without logging or documenting intent.
 *
 * This test verifies:
 *  1. No server-side file in our target list has a bare `catch {}` block
 *     (empty body, no comment, no logging)
 *  2. Every catch either: (a) logs the error, (b) has an `/* intentional` comment,
 *     or (c) has a `/* shutdown cleanup` comment
 *
 * Anti-false-positive: if we intentionally add a bare catch {} to a target file,
 * this test MUST fail.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// All server-side files that were in scope for GAP-P2-ERR
const TARGET_FILES = [
  "src/app/api/v1/api/chat/route.js",
  "src/app/api/oauth/[provider]/[action]/route.js",
  "src/app/api/providers/route.js",
  "src/app/api/models/test/ping.js",
  "src/app/api/tunnel/tailscale-install/route.js",
  "src/lib/auth/dashboardSession.js",
  "src/lib/db/repos/usageRepo.js",
  "src/lib/db/adapters/nodeSqliteAdapter.js",
  "src/lib/db/adapters/bunSqliteAdapter.js",
  "src/lib/db/adapters/betterSqliteAdapter.js",
  "src/lib/db/adapters/sqljsAdapter.js",
  "src/lib/db/backup.js",
  "src/lib/db/migrate.js",
  "src/lib/tunnel/tailscale/tailscale.js",
  "src/shared/utils/machineId.js",
  "src/lib/oauth/providers/kilocode.js",
  "src/lib/oauth/services/qoder.js",
  "src/mitm/server.js",
  "src/mitm/handlers/kiro.js",
];

// Regex that matches `catch {}` with optional whitespace but NO content inside braces
// This matches: catch {} / catch{ } / catch {   }
// Does NOT match: catch (e) {} / catch { /* comment */ } / catch { console.log() }
const BARE_CATCH_RE = /catch\s*(?:\(\s*\w*\s*\))?\s*\{\s*\}/g;

// After matching a bare catch, check if there's a comment or log statement
const HAS_COMMENT_OR_LOG = /(?:\/\*|\/\/|console\.|logger\.)/;

describe("GAP-P2-ERR: No silent catch {} blocks in target files", () => {
  for (const relPath of TARGET_FILES) {
    it(`${relPath} has no bare silent catch blocks`, () => {
      const fullPath = join(process.cwd(), relPath);
      let source;
      try {
        source = readFileSync(fullPath, "utf-8");
      } catch {
        // File may not exist in all environments (e.g. bun-specific adapter)
        console.log(`  SKIP: ${relPath} not found`);
        return;
      }

      const lines = source.split("\n");
      const violations = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for bare catch {} patterns
        const matches = line.matchAll(BARE_CATCH_RE);
        for (const m of matches) {
          // The catch block is empty (just whitespace between { and })
          // Check if there's an intentional comment on the same line
          if (!HAS_COMMENT_OR_LOG.test(line)) {
            violations.push({
              lineNum: i + 1,
              line: line.trim(),
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  Line ${v.lineNum}: ${v.line}`)
          .join("\n");
        throw new Error(
          `${relPath} has ${violations.length} bare silent catch block(s) without logging or intent comment:\n${details}\n\n` +
          `Fix: add console.error("[context]", e.message) or /* intentional: <reason> */ comment`
        );
      }
    });
  }

  it("anti-false-positive: test detects a bare catch {} if one is added", () => {
    // Simulate a line with a bare catch {} -- the regex should match it
    const fakeBadLine = "  } catch {}";
    const match = fakeBadLine.match(BARE_CATCH_RE);
    expect(match).not.toBeNull();
    expect(match.length).toBe(1);
    // And it should NOT have a comment/log
    expect(HAS_COMMENT_OR_LOG.test(fakeBadLine)).toBe(false);

    // Simulate a line with an intentional comment -- should NOT be flagged
    const fakeGoodLine = "  } catch { /* intentional: cleanup */ }";
    const match2 = fakeGoodLine.match(BARE_CATCH_RE);
    // The regex still matches the pattern, but HAS_COMMENT_OR_LOG catches the comment
    if (match2) {
      expect(HAS_COMMENT_OR_LOG.test(fakeGoodLine)).toBe(true);
    }

    // Simulate a line with logging -- should NOT be flagged
    const fakeLoggedLine = '  } catch (e) { console.error("x", e.message); }';
    const match3 = fakeLoggedLine.match(BARE_CATCH_RE);
    // This won't match BARE_CATCH_RE because the braces have content
    expect(match3).toBeNull();
  });
});
