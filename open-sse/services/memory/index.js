/**
 * 9Router AI Memory & Token Optimization Service
 *
 * Modular pipeline integrating:
 * - Phase 1: Tool Output Pruning & Historical Media Pruning
 * - Phase 2: Sliding Window Context Compaction
 * - Phase 3: Prompt Cache Breakpoint Anchoring (delegates to v2 anchorClaudeCache)
 * - Phase 4: Cross-Session Handoff Injection (store only — recording not yet wired)
 *
 * All lossy optimizations are opt-in (default-OFF) per PR #3599 TIER3 review.
 * cacheAnchor defaults OFF and skips on Claude passthrough (v2 anchor covers it).
 */

import { pruneHistoricalTools } from "./toolPruner.js";
import { pruneHistoricalMedia } from "./mediaPruner.js";
import { compactContextWindow } from "./contextCompactor.js";
import { anchorPromptCache } from "./cacheAnchor.js";


/**
 * Apply all enabled memory enhancements to a request body in sequence.
 *
 * @param {Object} body - Request body (messages array, system, tools, etc.)
 * @param {Object} options
 * @param {Object}  [options.settings]      - 9router settings object (from localDb)
 * @param {string}  [options.targetFormat]  - Target provider format ("claude", "openai", "gemini")
 * @param {string}  [options.projectKey]    - Optional project key for handoffs
 * @param {boolean} [options.passthrough]   - Whether this is a passthrough request
 * @param {string}  [options.clientTool]    - The client's tool/format identifier
 * @param {Object}  [options.log]           - Logger instance
 * @returns {Promise<{ body: Object, stats: Object }>}
 */
export async function applyMemoryEnhancements(body, options = {}) {
  const {
    settings = {},
    targetFormat = "openai",
    projectKey,
    passthrough = false,
    clientTool = null,
    log,
  } = options;

  const stats = {
    toolPruning: { applied: false, savedChars: 0 },
    mediaPruning: { applied: false, savedItems: 0 },
    compaction: { applied: false, savedTokens: 0 },
    cacheAnchor: { applied: false },
    handoff: { applied: false },
  };

  if (!body || typeof body !== "object") {
    return { body, stats };
  }

  // Phase 4: Pending Handoff Injection (if enabled + projectKey available)
  if (settings.memoryHandoffEnabled && projectKey) {
    const handoffRes = injectPendingHandoff(body, {
      enabled: true,
      projectKey,
    });
    if (handoffRes.injected) {
      stats.handoff.applied = true;
      log?.debug?.("MEMORY", `Injected previous session handoff for project: ${projectKey}`);
    }
  }

  // Phase 1a: Historical Media Pruning (default: disabled, opt-in)
  if (settings.memoryMediaPruningEnabled === true) {
    const mediaRes = pruneHistoricalMedia(body, { enabled: true });
    if (mediaRes.pruned) {
      stats.mediaPruning = { applied: true, savedItems: mediaRes.savedItems };
      log?.debug?.("MEMORY", `Pruned ${mediaRes.savedItems} historical media items`);
    }
  }

  // Phase 1b: Historical Tool Output Pruning (default: disabled, opt-in)
  if (settings.memoryToolPruningEnabled === true) {
    const toolRes = pruneHistoricalTools(body, {
      enabled: true,
      keepRecentTurns: settings.memoryMaxToolTurnsKeepFull ?? 2,
      maxHistoricalChars: settings.memoryMaxHistoricalToolChars ?? 4000,
    });
    if (toolRes.pruned) {
      stats.toolPruning = { applied: true, savedChars: toolRes.savedChars };
      log?.info?.(
        "MEMORY",
        `Tool Pruner saved ~${Math.round(toolRes.savedChars / 4)} tokens across ${toolRes.count} historical tool turns`
      );
    }
  }

  // Phase 2: Sliding Window Context Compaction (default: disabled, opt-in)
  if (settings.memoryCompactionEnabled === true) {
    const compactRes = compactContextWindow(body, {
      enabled: true,
      thresholdTokens: settings.memoryCompactionThresholdTokens ?? 128000,
      recentTurnsToKeep: settings.memoryRecentTurnsToKeep ?? 8,
    });
    if (compactRes.compacted) {
      stats.compaction = { applied: true, savedTokens: compactRes.savedTokens };
      log?.info?.(
        "MEMORY",
        `Context Compactor reduced prompt from ~${compactRes.originalTokens} to ~${compactRes.newTokens} tokens`
      );
    }
  }

  // Phase 3: Prompt Cache Breakpoint Anchoring (default: OFF — opt-in)
  // cacheAnchor.js internally skips on Claude passthrough (v2 anchor covers it)
  // and delegates to v2's anchorClaudeCache on translated Claude routes.
  if (settings.memoryCacheAnchorEnabled === true) {
    const cacheRes = anchorPromptCache(body, {
      enabled: true,
      format: targetFormat,
      passthrough,
      clientTool,
    });
    if (cacheRes.anchored) {
      stats.cacheAnchor.applied = true;
    }
  }

  return { body, stats };
}

export * from "./toolPruner.js";
export * from "./mediaPruner.js";
export * from "./contextCompactor.js";
export * from "./cacheAnchor.js";
export * from "./handoffStore.js";
