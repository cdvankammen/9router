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

export const MIGRATIONS = [m001, m003, m004, m005].sort((a, b) => a.version - b.version);

export function latestVersion() {
  return MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;
}
