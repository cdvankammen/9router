/**
 * Sliding Window Context Compactor (Memory Optimization)
 *
 * Inspired by ai-memory's session distillation and compaction:
 * When conversations span 30-100+ turns, passing the entire raw message history
 * can exhaust provider context limits, cause latency spikes, and generate massive costs.
 *
 * This module monitors total message payload size/token estimate. When the threshold is
 * crossed, it preserves the system instruction and the most recent `recentTurnsToKeep` turns,
 * while consolidating older turns into a structured summary block.
 */

const DEFAULT_THRESHOLD_TOKENS = 128000;
const DEFAULT_RECENT_TURNS = 8;
const CHARS_PER_TOKEN_ESTIMATE = 3.8;

/**
 * Fast conservative token estimation
 * @param {Array} items
 * @returns {number}
 */
export function estimateTokenCount(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  try {
    const rawLength = JSON.stringify(items).length;
    return Math.ceil(rawLength / CHARS_PER_TOKEN_ESTIMATE);
  } catch {
    return 0;
  }
}

/**
 * Extract concise text summary from a message item
 * @param {Object} msg
 * @returns {string}
 */
function summarizeMessage(msg) {
  if (!msg) return "";
  const role = msg.role || (msg.type === "function_call_output" ? "tool" : "user");
  let contentText = "";

  if (typeof msg.content === "string") {
    contentText = msg.content;
  } else if (Array.isArray(msg.content)) {
    contentText = msg.content
      .map((c) => (c?.type === "text" ? c.text : c?.type === "tool_use" ? `[called tool: ${c.name}]` : c?.type === "tool_result" ? `[tool result: ${typeof c.content === "string" ? c.content.slice(0, 100) : "output"}]` : ""))
      .filter(Boolean)
      .join(" ");
  } else if (typeof msg.output === "string") {
    contentText = msg.output;
  } else if (Array.isArray(msg.parts)) {
    contentText = msg.parts
      .map((p) => p.text || (p.functionCall ? `[call: ${p.functionCall.name}]` : p.functionResponse ? `[result: ${p.functionResponse.name}]` : ""))
      .filter(Boolean)
      .join(" ");
  }

  // Bound the per-message summary to max 300 chars for the summary block
  const cleaned = contentText.replace(/\s+/g, " ").trim();
  const truncated = cleaned.length > 250 ? `${cleaned.slice(0, 250)}...` : cleaned;
  return truncated ? `- **${role.toUpperCase()}**: ${truncated}` : "";
}

/**
 * Check if a message is a tool use (assistant message with tool_calls)
 * @param {Object} msg
 * @returns {boolean}
 */
function isToolUse(msg) {
  return Array.isArray(msg?.tool_calls) && msg.tool_calls.length > 0;
}

/**
 * Check if a message is a tool result (role "tool" with a tool_call_id)
 * @param {Object} msg
 * @returns {boolean}
 */
function isToolResult(msg) {
  return msg?.role === "tool" && typeof msg?.tool_call_id === "string";
}

/**
 * Get all tool_call_ids from a tool use message
 * @param {Object} msg
 * @returns {string[]}
 */
function getToolCallIds(msg) {
  return Array.isArray(msg?.tool_calls) ? msg.tool_calls.map((tc) => tc.id).filter(Boolean) : [];
}

/**
 * Validate a message sequence for provider acceptance:
 * 1. No consecutive same-role messages for the alternation roles
 *    (user->user, assistant->assistant). tool->tool is VALID (multiple
 *    tool results for one assistant tool_calls turn). system ignored.
 * 2. No dangling tool results: every tool message's tool_call_id must have
 *    been declared by a preceding assistant tool_calls message.
 * 3. No unresolved tool_use: a tool_calls message must be followed by its
 *    tool results before the next non-tool message (a trailing assistant
 *    tool_calls message is legal — it is the in-flight tool loop state).
 * @param {Array} messages
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSequence(messages) {
  const errors = [];

  for (let i = 1; i < messages.length; i++) {
    const prevRole = messages[i - 1]?.role;
    const currRole = messages[i]?.role;
    if (!prevRole || !currRole || prevRole === "system" || currRole === "system") continue;
    if (prevRole === currRole && prevRole !== "tool") {
      errors.push(`alternationBreaks: "${prevRole}->${prevRole}@${i}"`);
    }
  }

  const pendingToolCallIds = new Set();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (isToolUse(msg)) {
      getToolCallIds(msg).forEach((id) => pendingToolCallIds.add(id));
    } else if (isToolResult(msg)) {
      if (!pendingToolCallIds.has(msg.tool_call_id)) {
        errors.push(`danglingToolCallIds: ["${msg.tool_call_id}"]`);
      } else {
        pendingToolCallIds.delete(msg.tool_call_id);
      }
    } else if (pendingToolCallIds.size > 0) {
      // A non-tool message arrived while tool calls are still unresolved
      // (exception: if this is the final message, see end-of-loop check)
      errors.push(`unresolvedToolCallIds: [${[...pendingToolCallIds].map((x) => `"${x}"`).join(", ")}]`);
      pendingToolCallIds.clear();
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Export validation for reuse by tests and the orchestrator
 */
export { validateSequence };

/**
 * Compact older conversation history into a structured summary
 * @param {Object} body - Request body
 * @param {Object} options
 * @param {boolean} options.enabled - Whether compaction is enabled
 * @param {number} [options.thresholdTokens=128000] - Token threshold to trigger compaction
 * @param {number} [options.recentTurnsToKeep=8] - Number of recent turns to keep intact
 * @returns {{ body: Object, compacted: boolean, originalTokens: number, newTokens: number }}
 */
export function compactContextWindow(body, options = {}) {
  const {
    enabled = false,
    thresholdTokens = DEFAULT_THRESHOLD_TOKENS,
    recentTurnsToKeep = DEFAULT_RECENT_TURNS,
  } = options;

  if (!enabled || !body || typeof body !== "object") {
    return { body, compacted: false, originalTokens: 0, newTokens: 0 };
  }

  const items = Array.isArray(body.messages)
    ? body.messages
    : Array.isArray(body.input)
    ? body.input
    : null;

  if (!items || items.length <= recentTurnsToKeep + 2) {
    return { body, compacted: false, originalTokens: 0, newTokens: 0 };
  }

  const originalTokens = estimateTokenCount(items);
  if (originalTokens < thresholdTokens) {
    return { body, compacted: false, originalTokens, newTokens: originalTokens };
  }

  // Preserve system messages at the start
  const systemMessages = [];
  let conversationStartIndex = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i]?.role === "system") {
      systemMessages.push(items[i]);
      conversationStartIndex = i + 1;
    } else {
      break;
    }
  }

  const conversationalItems = items.slice(conversationStartIndex);
  if (conversationalItems.length <= recentTurnsToKeep) {
    return { body, compacted: false, originalTokens, newTokens: originalTokens };
  }

  // Compute splitIndex respecting tool_use/tool_result pair boundaries.
  // A naive cut at `len - recentTurnsToKeep` can separate an assistant
  // tool_calls message from its tool result(s), leaving a dangling tool
  // result in the kept window (provider 400 / sequence error). Walk the
  // boundary back until no pair straddles it:
  //   - first kept item is a tool result      → its tool_use was cut away → step back
  //   - last older item is a tool_use         → its tool results were cut away → step back
  let splitIndex = conversationalItems.length - recentTurnsToKeep;
  while (splitIndex > 0) {
    const current = conversationalItems[splitIndex];
    const prev = conversationalItems[splitIndex - 1];
    if (isToolResult(current) || isToolUse(prev)) {
      splitIndex--;
      continue;
    }
    break;
  }

  const olderItems = conversationalItems.slice(0, splitIndex);
  const recentItems = conversationalItems.slice(splitIndex);

  // Nothing was actually compacted (walk-back consumed the whole window) — skip.
  if (olderItems.length === 0) {
    return { body, compacted: false, originalTokens, newTokens: originalTokens };
  }

  // Generate structured summary from older items
  const summaryLines = olderItems
    .map(summarizeMessage)
    .filter(Boolean)
    .slice(-20); // Keep up to 20 key highlights

  const summaryContent = [
    `[Historical Context Summary by 9router Memory Optimizer]`,
    `Notice: Earlier conversation turns (${olderItems.length} messages) have been compacted to conserve context window.`,
    `Key highlights of earlier conversation:`,
    ...summaryLines,
  ].join("\n");

  // Single summary message (user role). Deliberately NO synthetic assistant
  // ack: an inserted assistant message before a kept assistant message would
  // create an assistant->assistant alternation break. When the first kept
  // message is itself a user message, merge the summary INTO it instead of
  // inserting a second adjacent user message (user->user alternation break).
  const compactedMessages = [...systemMessages];

  const firstRecent = recentItems[0];
  if (firstRecent && firstRecent.role === "user" && !isToolResult(firstRecent)) {
    const merged = { ...firstRecent };
    if (typeof merged.content === "string") {
      merged.content = `${summaryContent}\n\n${merged.content}`;
    } else if (Array.isArray(merged.content)) {
      merged.content = [{ type: "text", text: summaryContent }, ...merged.content];
    } else {
      merged.content = summaryContent;
    }
    compactedMessages.push(merged, ...recentItems.slice(1));
  } else {
    compactedMessages.push(
      { role: "user", content: summaryContent },
      ...recentItems
    );
  }

  // Validate the resulting sequence (no same-role adjacency, no dangling
  // tool results). If invalid, skip compaction for this round and leave the
  // body untouched.
  const validation = validateSequence(compactedMessages);
  if (!validation.valid) {
    return { body, compacted: false, originalTokens, newTokens: originalTokens };
  }

  if (Array.isArray(body.messages)) {
    body.messages = compactedMessages;
  } else if (Array.isArray(body.input)) {
    body.input = compactedMessages;
  }

  const newTokens = estimateTokenCount(compactedMessages);

  return {
    body,
    compacted: true,
    originalTokens,
    newTokens,
    savedTokens: Math.max(0, originalTokens - newTokens),
  };
}