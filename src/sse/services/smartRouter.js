/**
 * Smart Router — App-layer pre-combo interception.
 *
 * Runs BEFORE translation in handleChat(). Classifies the task,
 * scores available models, creates/reuses a dynamic combo for
 * automatic error fallback, and tracks concurrency per model.
 *
 * Architecture: pre-combo interception (mirrors capacity adapter pattern).
 * NOT an executor — avoids double-translation flaw.
 */

import { getSettings } from "@/lib/localDb";
import { createCombo, getComboByName, updateCombo } from "@/lib/db/repos/combosRepo.js";
import {
  classifyTask,
  scoreModel,
  getStickySession as _getStickySession,
  setStickySession as _setStickySession,
} from "open-sse/services/smartRouter.js";
import { PROVIDERS } from "open-sse/config/providers.js";
import { PROVIDER_MODELS, PROVIDER_ID_TO_ALIAS } from "open-sse/config/providerModels.js";
import * as log from "../utils/logger.js";

// PROVIDER_MODELS is keyed by ALIAS (or id when no alias). Map alias → provider
// id so combo model strings use canonical ids (e.g. "kr" → "kiro").
const ALIAS_TO_PROVIDER_ID = new Map(
  Object.entries(PROVIDER_ID_TO_ALIAS).map(([id, alias]) => [alias, id])
);

/** Escape regex metacharacters for wildcard-pattern matching. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Concurrency Tracking ────────────────────────────────────────────────────

const activeRequests = new Map(); // modelStr → count

export function trackRequestStart(modelStr) {
  activeRequests.set(modelStr, (activeRequests.get(modelStr) || 0) + 1);
}

export function trackRequestEnd(modelStr) {
  const count = (activeRequests.get(modelStr) || 1) - 1;
  if (count <= 0) activeRequests.delete(modelStr);
  else activeRequests.set(modelStr, count);
}

export function getActiveCount(modelStr) {
  return activeRequests.get(modelStr) || 0;
}

// ── Dynamic Combo Management ────────────────────────────────────────────────

const COMBO_PREFIX = "sr-"; // smart router combo prefix
const COMBO_TTL_MS = 30 * 60 * 1000; // 30 min before stale combos can be cleaned

/**
 * Get or create a dynamic combo for the given candidates.
 * Returns the combo name to use as modelStr.
 */
async function getOrCreateSmartCombo(candidates, taskType, virtualModel) {
  // Build a stable combo name from the top candidate + task type
  const topModel = candidates[0];
  const safeName = `${COMBO_PREFIX}${virtualModel}-${taskType.replace(/:/g, "-")}`;

  // Check if combo already exists with same models
  const existing = await getComboByName(safeName);
  const candidateModels = candidates.map((c) => `${c.provider}/${c.model}`);

  if (existing) {
    // Update if model list changed. combosRepo returns models as a parsed
    // array (rowToCombo) — tolerate a raw JSON string for robustness.
    const existingModels = Array.isArray(existing.models)
      ? existing.models
      : (() => { try { return JSON.parse(existing.models || "[]"); } catch { return []; } })();
    const modelsMatch =
      existingModels.length === candidateModels.length &&
      existingModels.every((m, i) => m === candidateModels[i]);

    if (!modelsMatch) {
      await updateCombo(existing.id, { models: candidateModels });
      log.info("SMART", `Updated combo "${safeName}" → [${candidateModels.join(", ")}]`);
    }
    return safeName;
  }

  // Create new combo
  try {
    await createCombo({
      name: safeName,
      kind: "llm",
      models: candidateModels,
    });
    log.info("SMART", `Created combo "${safeName}" → [${candidateModels.join(", ")}]`);
  } catch (err) {
    // Race condition: another request created it between our check and create
    if (err.message?.includes("UNIQUE constraint")) {
      return safeName;
    }
    throw err;
  }

  return safeName;
}

// ── Session Stickiness ──────────────────────────────────────────────────────
// The open-sse session API stores {provider, model} — we store the combo name
// in the provider slot and read it back. Same TTL/eviction, no double cache.

function getSticky(messages) {
  const entry = _getStickySession(messages);
  return entry?.provider || null;
}

function setSticky(messages, comboName) {
  _setStickySession(messages, comboName, null);
}

// ── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Resolve a smart router model string to a real combo name.
 * Called from handleChat() BEFORE combo resolution and translation.
 *
 * @param {string} modelStr - The model string from the request
 * @param {object} body - The original request body (untranslated)
 * @param {object} settings - Current settings from DB
 * @returns {Promise<{comboName: string, taskType: string}|null>} Resolved combo
 *   name + classified task type, or null if not a smart router request
 */
export async function resolveSmartRouter(modelStr, body, settings) {
  const config = settings.smartRouter;
  if (!config?.enabled) return null;

  // Check if this modelStr matches a configured trigger name
  const triggerNames = config.names || ["modelRouter"];
  if (!triggerNames.includes(modelStr)) return null;

  const messages = body.messages || [];

  // 1. Check session stickiness first
  const sticky = getSticky(messages);
  if (sticky) {
    log.debug("SMART", `Sticky session hit: ${modelStr} → ${sticky}`);
    return { comboName: sticky, taskType: classifyTask(messages) };
  }

  // 2. Classify task from prompt content
  const taskType = classifyTask(messages);

  // 3. Determine allowed providers (by canonical provider id)
  const allowedProviders =
    config.allowedProviders?.length > 0
      ? config.allowedProviders
      : [...ALIAS_TO_PROVIDER_ID.values()].filter((id) => id !== "9router" && id !== "9r");
  const allowedSet = new Set(allowedProviders);

  const costQualityTradeoff = config.costQualityTradeoff ?? 5;
  const maxCandidates = config.maxCandidates ?? 3;

  // 4. Score all candidate models. PROVIDER_MODELS is keyed by ALIAS — the
  //    transport-only PROVIDERS map has no models, so iterate PROVIDER_MODELS
  //    and map each alias back to its canonical provider id.
  //
  //    allowedModels (optional) narrows the pool to explicit "provider/model"
  //    strings or wildcard patterns ("openai/*", "*/claude-*") — this is how
  //    users pick a SPECIFIC subset of models the smart router may use.
  const modelPatterns = (config.allowedModels || []).map((p) => {
    const lower = p.trim().toLowerCase();
    if (!lower) return null;
    const parts = lower.split("/");
    const providerPart = parts[0] || "*";
    const modelPart = parts.slice(1).join("/") || "*";
    const toRe = (s) => "^" + s.split("*").map(escapeRegExp).join(".*") + "$";
    return {
      providerRe: new RegExp(toRe(providerPart)),
      modelRe: new RegExp(toRe(modelPart)),
    };
  }).filter(Boolean);
  const hasModelFilter = modelPatterns.length > 0;

  const candidates = [];
  for (const [alias, models] of Object.entries(PROVIDER_MODELS)) {
    if (!Array.isArray(models) || models.length === 0) continue;
    const providerId = ALIAS_TO_PROVIDER_ID.get(alias) || alias;
    if (providerId === "9router" || providerId === "9r") continue;
    if (!allowedSet.has(providerId)) continue;

    for (const model of models) {
      const modelId = model.id || model;

      // Narrow to the user's explicit model subset (if configured)
      if (hasModelFilter) {
        const fullLower = `${providerId}/${modelId}`.toLowerCase();
        const matched = modelPatterns.some((p) => p.providerRe.test(fullLower.split("/")[0]) && p.modelRe.test(fullLower.split("/").slice(1).join("/")));
        if (!matched) continue;
      }

      let score = scoreModel(providerId, modelId, taskType, costQualityTradeoff);

      // Apply concurrency penalty: prefer less-loaded models
      const fullModelStr = `${providerId}/${modelId}`;
      const activeCount = getActiveCount(fullModelStr);
      if (activeCount > 0) {
        score -= activeCount * 2; // 2 points per active request
      }

      if (score > 0) {
        candidates.push({ provider: providerId, model: modelId, score, taskType });
      }
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    log.warn("SMART", `No suitable models found for ${modelStr} (task: ${taskType})`);
    return null;
  }

  // 5. Take top N candidates for fallback chain
  const topCandidates = candidates.slice(0, maxCandidates);

  // 6. Create or reuse a dynamic combo with these candidates
  const comboName = await getOrCreateSmartCombo(topCandidates, taskType, modelStr);

  // 7. Store sticky session so subsequent turns use the same combo
  setSticky(messages, comboName);

  log.info(
    "SMART",
    `Router "${modelStr}" → combo "${comboName}" (task: ${taskType}, ` +
      `top: ${topCandidates[0].provider}/${topCandidates[0].model}, ` +
      `candidates: ${topCandidates.length})`
  );

  return { comboName, taskType };
}
