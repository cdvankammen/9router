// Migration registry — append new entries when schema changes.
// Each migration: { version: number, name: string, up(db): void }
// Versions MUST be unique and monotonically increasing.
import m001 from "./001-initial.js";
// 002-fk-provider-connections UNREGISTERED: FK providerConnections.provider →
// providerNodes(id) was too restrictive in practice (production deployments
// dropped it manually). providerConnections rows may reference providers that
// have no explicit providerNodes entry (standard registry providers).
import m003 from "./003-message-facets.js";
import m004 from "./004-message-annotations.js";
import m005 from "./005-seen-models.js";
import m006 from "./006-access-columns.js";

export const MIGRATIONS = [m001, m003, m004, m005, m006].sort((a, b) => a.version - b.version);

export function latestVersion() {
  return MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;
}

/**
 * Ordered "version:name" signature of the registry (backlog #2).
 *
 * Deliberately built from identifiers only — NOT from migration bodies — so it
 * is stable across transpilation/bundling, but still changes whenever a
 * migration is added, removed, reordered, or renamed. That divergence is exactly
 * the silent-corruption scenario the runner must refuse.
 */
export function registryFingerprint() {
  return MIGRATIONS.map((m) => `${m.version}:${m.name}`).join("|");
}

/**
 * Validate the registry shape before anything is applied (backlog #2).
 * Returns { ok, problems[] }. A broken registry is refused, never applied.
 */
export function validateMigrationRegistry() {
  const problems = [];
  const seen = new Set();
  let prev = 0;
  for (const m of MIGRATIONS) {
    if (!m || typeof m !== "object") {
      problems.push("registry entry is not an object");
      continue;
    }
    if (!Number.isInteger(m.version)) problems.push(`migration ${m.name ?? "?"} has non-integer version`);
    if (typeof m.name !== "string" || !m.name) problems.push(`migration v${m.version} has invalid name`);
    if (typeof m.up !== "function") problems.push(`migration ${m.name ?? m.version} has no up() function`);
    if (seen.has(m.version)) problems.push(`duplicate version ${m.version}`);
    seen.add(m.version);
    if (Number.isInteger(m.version) && m.version <= prev) {
      problems.push(`version ${m.version} is not monotonically increasing (prev ${prev})`);
    }
    if (Number.isInteger(m.version)) prev = m.version;
  }
  return { ok: problems.length === 0, problems };
}
