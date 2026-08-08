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

import { getSettings, getProviderNodes, getProviderConnections } from "@/lib/localDb";
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

// ── Custom provider node models (short-TTL cache) ───────────────────────────
// User-defined OpenAI/Anthropic-compatible nodes aren't in the static registry,
// so the router fetches their /models endpoint once per TTL window.
//
// Auth: many custom routers (e.g. Dialagram) gate /models behind an API key,
// so we look up an active connection for the node and forward its apiKey as a
// Bearer header (OpenAI-compatible) or x-api-key (Anthropic-compatible). This
// mirrors the same pattern in src/app/api/providers/[id]/models/route.js.
// Fail-open: if no connection exists or the fetch fails, we return [] — the
// router just skips that node rather than crashing.
const NODE_MODELS_TTL_MS = 5 * 60 * 1000;
const nodeModelsCache = new Map(); // nodeId -> { models: [{id,name}], ts }

/**
 * Resolve the apiKey for a provider node by looking up the first active
 * connection whose provider id matches the node id. Returns null if none.
 */
async function getNodeApiKey(nodeId) {
  try {
    const connections = await getProviderConnections({ provider: nodeId, isActive: true });
    if (!connections || connections.length === 0) return null;
    // Prefer the highest-priority (lowest number) connection; the list is
    // already sorted by priority in getProviderConnections.
    return connections[0]?.apiKey || null;
  } catch {
    return null;
  }
}

async function getNodeModels(node) {
  const cached = nodeModelsCache.get(node.id);
  if (cached && Date.now() - cached.ts < NODE_MODELS_TTL_MS) return cached.models;
  try {
    let baseUrl = String(node.baseUrl || "").replace(/\/+$/, "");
    if (baseUrl.endsWith("/messages")) baseUrl = baseUrl.slice(0, -"/messages".length);
    if (!baseUrl) return [];
    const url = `${baseUrl}/models`;

    // Build auth headers based on node type (matches dashboard /models route)
    const apiKey = await getNodeApiKey(node.id);
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      if (node.type === "anthropic-compatible") {
        headers["x-api-key"] = apiKey;
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        // openai-compatible (default)
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch(url, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) {
      // Auth-gated or unreachable — log once, return empty so the router
      // silently skips this node rather than poisoning the candidate list.
      log.debug("SMART", `getNodeModels(${node.id}) → ${res.status}`);
      return [];
    }
    const data = await res.json();
    const models = (data.data || data.models || [])
      .map((m) => ({ id: m.id || m, name: m.name || m.id || m }))
      .filter((m) => typeof m.id === "string" && m.id.length > 0);
    nodeModelsCache.set(node.id, { models, ts: Date.now() });
    return models;
  } catch {
    return [];
  }
}

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

function getSticky(messages, ttlMs) {
  const entry = _getStickySession(messages, ttlMs);
  return entry?.provider || null;
}

function setSticky(messages, comboName, ttlMs) {
  _setStickySession(messages, comboName, null, ttlMs);
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

  // Sticky TTL is configurable (minutes); default 5. Passed through so the
  // session cache honors the user's setting.
  const stickyTtlMin = Number.isFinite(Number(config.stickyTtlMin))
    ? Math.max(1, Number(config.stickyTtlMin))
    : 5;
  const stickyTtlMs = stickyTtlMin * 60 * 1000;

  // 1. Check session stickiness first
  const sticky = getSticky(messages, stickyTtlMs);
  if (sticky) {
    log.debug("SMART", `Sticky session hit: ${modelStr} → ${sticky}`);
    return { comboName: sticky, taskType: classifyTask(messages), scores: null, sticky: true };
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

  // 4b. Score user-defined provider nodes (custom OpenAI/Anthropic-compatible).
  //     Their models come from the live /models endpoint (short-TTL cached).
  //     Eligible when: allowedProviders is empty (allow all) OR the node id or
  //     its prefix matches the allowed list. Model strings use the node PREFIX
  //     ("mockreal/gpt-4o-mini") so combos read like what clients type.
  const explicitProvidersConfigured = (config.allowedProviders || []).length > 0;
  const nodes = await getProviderNodes();
  for (const node of nodes) {
    if (node.type !== "openai-compatible" && node.type !== "anthropic-compatible") continue;
    const nodeId = node.id;
    const prefix = node.prefix || nodeId;
    if (nodeId === "9router" || prefix === "9router" || prefix === "9r") continue;
    if (explicitProvidersConfigured && !allowedSet.has(nodeId) && !allowedSet.has(prefix)) continue;

    const nodeModels = await getNodeModels(node);
    for (const model of nodeModels) {
      const modelId = model.id;

      // allowedModels matching: try both the prefix and the internal node id
      if (hasModelFilter) {
        const matched = modelPatterns.some((p) => {
          const pTest = (prov) => p.providerRe.test(prov) && p.modelRe.test(modelId);
          return pTest(prefix) || pTest(nodeId);
        });
        if (!matched) continue;
      }

      let score = scoreModel(prefix, modelId, taskType, costQualityTradeoff);
      const fullModelStr = `${prefix}/${modelId}`;
      const activeCount = getActiveCount(fullModelStr);
      if (activeCount > 0) score -= activeCount * 2;

      if (score > 0) {
        candidates.push({ provider: prefix, model: modelId, score, taskType });
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

  // Score breakdown for observability (why did it pick X?): expose the top
  // candidates with their scores so the dashboard can show a "why" panel.
  const scores = topCandidates.map((c) => ({
    model: `${c.provider}/${c.model}`,
    score: Math.round(c.score * 100) / 100,
  }));

  // 6. Create or reuse a dynamic combo with these candidates
  const comboName = await getOrCreateSmartCombo(topCandidates, taskType, modelStr);

  // 7. Store sticky session so subsequent turns use the same combo
  setSticky(messages, comboName, stickyTtlMs);

  log.info(
    "SMART",
    `Router "${modelStr}" → combo "${comboName}" (task: ${taskType}, ` +
      `top: ${topCandidates[0].provider}/${topCandidates[0].model}, ` +
      `candidates: ${topCandidates.length}, ` +
      `scores: [${scores.map((s) => `${s.model}=${s.score}`).join(", ")}])`
  );

  return { comboName, taskType, scores, sticky: false };
}
