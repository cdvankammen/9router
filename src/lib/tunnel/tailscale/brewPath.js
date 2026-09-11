// Shared brew detection — filesystem-only, no shell resolution.
// Prevents arbitrary command execution via PATH injection (GAP-P2-15).
import fs from "fs";

/** Absolute paths where Homebrew may be installed. Order: Apple Silicon first, then Intel. */
export const BREW_CANDIDATES = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

/**
 * Find the first existing brew binary by absolute path.
 * @param {function(string): boolean} [existsCheck] - Injectable existence checker (defaults to fs.existsSync).
 *   Exposed for unit testing without mocking node:fs.
 * Returns the absolute path string, or null if brew is not installed.
 * No shell invocation, no PATH dependency.
 */
export function findBrewBin(existsCheck) {
  const check = existsCheck || fs.existsSync;
  for (const p of BREW_CANDIDATES) {
    try {
      if (check(p)) return p;
    } catch { /* ignore permission errors */ }
  }
  return null;
}

/** Boolean convenience wrapper. */
export function hasBrew(existsCheck) {
  return findBrewBin(existsCheck) !== null;
}
