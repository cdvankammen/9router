/**
 * Prompt Cache Breakpoint Anchor (Memory Optimization)
 *
 * Reimplemented on v2's anchorClaudeCache semantics to avoid the naive PR #3599
 * implementation that conflicted with v2's existing cache anchoring:
 * - 1h TTL (CACHE_CONTROL_1H) instead of naive 5m ephemeral
 * - Strips cache_control from defer_loading tools (#3567 — Anthropic rejects both)
 * - Budget caps (max 4 cache_control blocks)
 * - Prefers last assistant turn for message anchoring
 *
 * Behavior:
 * - Claude passthrough (passthrough && clientTool==="claude"): SKIP — v2's
 *   anchorClaudeCache runs later in chatCore.js and covers this case. Running
 *   here would be redundant and could emit intermediate invalid shapes
 *   (defer_loading + cache_control) before v2 strips them.
 * - Translated Claude routes: delegate to v2's anchorClaudeCache.
 * - Other formats (openai, gemini): no-op — cache anchoring is Claude-specific.
 */

import { anchorClaudeCache } from "../../translator/formats/claude.js";

/**
 * Anchor prompt caching breakpoints in request body.
 * @param {Object} body - Request body
 * @param {Object} options
 * @param {boolean} options.enabled - Whether cache anchoring is enabled
 * @param {string} options.format - Target format (e.g. "claude", "openai", "gemini")
 * @param {boolean} [options.passthrough=false] - Whether this is a passthrough request
 * @param {string} [options.clientTool=null] - The client's tool/format identifier
 * @returns {{ body: Object, anchored: boolean }}
 */
export function anchorPromptCache(body, options = {}) {
  const {
    enabled = true,
    format = "claude",
    passthrough = false,
    clientTool = null,
  } = options;

  if (!enabled || !body || typeof body !== "object") {
    return { body, anchored: false };
  }

  // Claude format: delegate to v2's anchorClaudeCache (1h TTL, #3567 defer_loading
  // strip, budget caps). Skip on passthrough — v2's anchor runs later in chatCore
  // and covers it; running here would be redundant and could emit intermediate
  // invalid shapes (defer_loading + cache_control) before v2 strips them.
  if (format === "claude" || format === "anthropic") {
    if (passthrough && clientTool === "claude") {
      return { body, anchored: false };
    }

    // v2's anchor mutates body in place and returns it. It handles:
    // - normalizeMessageContent (strips bare-object cache_control)
    // - defer_loading strip (#3567)
    // - 1h TTL on last system block and last cacheable tool
    // - Budget cap (max 4 markers)
    // - Last assistant turn preference for message anchoring
    anchorClaudeCache(body);
    return { body, anchored: true };
  }

  // Other formats: no-op. Cache anchoring is Claude-specific in v2.
  return { body, anchored: false };
}
