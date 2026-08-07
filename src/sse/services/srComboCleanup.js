/**
 * Smart-router combo cleanup — optional, disabled by default.
 *
 * The smart router creates dynamic combos named `sr-*` on demand. Over time
 * stale combos (whose model lists were superseded or that stopped being used)
 * accumulate in the `combos` table. This module optionally sweeps them:
 *
 * - Enabled ONLY via settings (`srComboCleanup.enabled`), default OFF.
 * - Deletes only combos whose name starts with the smart-router prefix
 *   (`sr-`) and whose `updatedAt` is older than the configured TTL.
 * - Fail-open everywhere: any error in a tick is logged and swallowed, and a
 *   failing delete never aborts the sweep of the remaining combos.
 *
 * Mirrors the `backgroundTokenRefresh.js` scheduler pattern (idempotent
 * start, DI-friendly tick, no-op outside a long-running server runtime).
 */

import * as log from "../utils/logger.js";

export const SMART_COMBO_PREFIX = "sr-";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000; // every 12h
const INITIAL_DELAY_MS = 60 * 1000; // 1 min after boot

let started = false;
let intervalHandle = null;
let initialTimeoutHandle = null;
let tickRunning = false;

function isNonServerRuntime() {
  if (typeof window !== "undefined") return true;
  const phase = process.env.NEXT_PHASE || "";
  if (
    phase === "phase-production-build" ||
    phase === "phase-export" ||
    phase === "phase-static"
  ) {
    return true;
  }
  if (process.env.NEXT_RUNTIME === "edge") return true;
  return false;
}

/** ms since epoch for an ISO date string; null if unparseable. */
function toMs(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/**
 * Pure selection: which combos are stale smart-router combos?
 *
 * A combo qualifies when ALL of:
 * 1. `name` starts with the smart-router prefix (`sr-`)
 * 2. `updatedAt` parses to a timestamp
 * 3. `updatedAt` is older than `nowMs - ttlMs`
 *
 * Combos without a parseable date are skipped (never delete on unknown age —
 * fail-safe, not fail-open).
 *
 * @param {Array<object>} combos
 * @param {number} ttlMs
 * @param {number} [nowMs]
 * @returns {Array<object>}
 */
export function selectStaleSmartCombos(combos, ttlMs, nowMs = Date.now()) {
  if (!Array.isArray(combos) || combos.length === 0) return [];
  const cutoff = nowMs - (Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS);
  const out = [];
  for (const combo of combos) {
    if (!combo || typeof combo !== "object") continue;
    const name = String(combo.name || "");
    if (!name.startsWith(SMART_COMBO_PREFIX)) continue;
    const updatedAtMs = toMs(combo.updatedAt);
    if (updatedAtMs === null) continue; // unknown age → keep
    if (updatedAtMs < cutoff) out.push(combo);
  }
  return out;
}

/**
 * One cleanup tick. Fail-open: per-combo delete errors are logged and the
 * sweep continues; a thrown load error aborts only this tick.
 *
 * @param {object} deps
 * @param {Function} [deps.loadCombos] async () => combo rows
 * @param {Function} [deps.deleteCombo] async (id) => boolean
 * @param {number} [deps.ttlMs] stale age threshold
 * @param {number} [deps.nowMs]
 * @param {object} [deps.logger] logger with warn/info/debug (defaults to app log)
 * @returns {Promise<{scanned: number, deleted: number, deletedNames: string[], errors: number}>}
 */
export async function runSrComboCleanupTick(deps = {}) {
  const load = deps.loadCombos || loadAllCombos;
  const remove = deps.deleteCombo || deleteComboById;
  const ttlMs = Number.isFinite(deps.ttlMs) && deps.ttlMs > 0 ? deps.ttlMs : DEFAULT_TTL_MS;
  const logger = deps.logger || log;

  if (tickRunning) {
    logger.debug("SR_CLEANUP", "Tick already running, skip");
    return { scanned: 0, deleted: 0, deletedNames: [], errors: 0, skipped: true };
  }
  tickRunning = true;
  const result = { scanned: 0, deleted: 0, deletedNames: [], errors: 0, skipped: false };
  try {
    const combos = await load();
    if (!Array.isArray(combos)) {
      logger.warn("SR_CLEANUP", "loadCombos did not return an array, skipping tick");
      return result;
    }
    const stale = selectStaleSmartCombos(combos, ttlMs, deps.nowMs || Date.now());
    result.scanned = stale.length;

    for (const combo of stale) {
      try {
        const removed = await remove(combo.id);
        if (removed) {
          result.deleted += 1;
          result.deletedNames.push(combo.name);
          logger.info("SR_CLEANUP", `Deleted stale smart combo "${combo.name}"`);
        }
      } catch (err) {
        result.errors += 1;
        logger.warn("SR_CLEANUP", `Delete failed for "${combo.name}" (swallowed)`, err?.message || err);
      }
    }
  } catch (err) {
    result.errors += 1;
    logger.warn("SR_CLEANUP", "Tick failed (swallowed)", err?.message || err);
  } finally {
    tickRunning = false;
  }
  return result;
}

async function loadAllCombos() {
  const { getCombos } = await import("../../lib/db/repos/combosRepo.js");
  return getCombos();
}

async function deleteComboById(id) {
  const { deleteCombo } = await import("../../lib/db/repos/combosRepo.js");
  return deleteCombo(id);
}

/**
 * Start the periodic scheduler. No-op when:
 * - disabled via the `enabled` flag (the caller decides from settings), or
 * - not in a long-running server runtime (build/export/edge), or
 * - already started (idempotent).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.enabled]
 * @param {number} [opts.ttlHours] stale age threshold in hours
 * @param {number} [opts.intervalHours] sweep period in hours
 */
export function startSrComboCleanup({ enabled = false, ttlHours, intervalHours } = {}) {
  if (!enabled) {
    log.debug("SR_CLEANUP", "Disabled via settings (srComboCleanup.enabled=false)");
    return false;
  }
  if (started) {
    log.debug("SR_CLEANUP", "Already started, skip");
    return true;
  }
  if (isNonServerRuntime()) {
    log.debug("SR_CLEANUP", "Skip start outside long-running server runtime");
    return false;
  }

  const ttlMs = (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : DEFAULT_TTL_MS / 3600000) * 3600000;
  const intervalMs = (Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : DEFAULT_INTERVAL_MS / 3600000) * 3600000;

  started = true;
  const safeTick = () => runSrComboCleanupTick({ ttlMs }).catch((err) => {
    log.warn("SR_CLEANUP", "Unhandled tick rejection (swallowed)", err?.message || err);
  });

  initialTimeoutHandle = setTimeout(safeTick, INITIAL_DELAY_MS);
  intervalHandle = setInterval(safeTick, intervalMs);
  if (initialTimeoutHandle?.unref) initialTimeoutHandle.unref();
  if (intervalHandle?.unref) intervalHandle.unref();

  log.info("SR_CLEANUP", "Scheduler started", {
    ttlHours: ttlMs / 3600000,
    intervalMs,
  });
  return true;
}

export function stopSrComboCleanup() {
  if (initialTimeoutHandle) clearTimeout(initialTimeoutHandle);
  if (intervalHandle) clearInterval(intervalHandle);
  initialTimeoutHandle = null;
  intervalHandle = null;
  started = false;
  log.info("SR_CLEANUP", "Scheduler stopped");
}
