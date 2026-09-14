/**
 * Smart Router — engine-layer task classifier + model scorer + session stickiness.
 *
 * The app-layer `src/sse/services/smartRouter.js` imports these functions to
 * resolve the "9router" virtual provider's model strings (auto, best-code,
 * best-chat, best-reasoning, best-cheap) into real provider/model candidates
 * BEFORE translation, avoiding the double-translation flaw of the executor
 * approach.
 *
 * Exports: classifyTask, scoreModel, selectModels, getStickySession,
 *          setStickySession, cleanupSessions
 */

// ── Task Classification ─────────────────────────────────────────────────────

const TASK_RULES = [
  { type: "code:debugging", keywords: ["debug", "fix", "error", "bug", "traceback", "exception", "stack trace", "crash"] },
  { type: "code:review", keywords: ["review code", "code review", "audit", "lint", "refactor"] },
  { type: "code:generation", keywords: ["write", "create", "generate", "implement", "function", "class", "script"], patterns: [/```[\w]*\n/] },
  { type: "agent:multi_step", keywords: ["step by step", "multi-step", "plan and execute", "autonomous"] },
  { type: "math", keywords: ["calculate", "solve", "equation", "math", "formula", "integral", "derivative"] },
  { type: "reasoning", keywords: ["reason", "logic", "deduce", "analyze", "think through", "explain why"] },
  { type: "research_report", keywords: ["research", "report", "analysis", "investigate", "survey"] },
  { type: "creative_writing", keywords: ["story", "poem", "essay", "creative", "fiction", "novel"] },
  { type: "summarization", keywords: ["summarize", "summary", "tldr", "brief", "condense"] },
  { type: "translation", keywords: ["translate", "translation", "transliterate"] },
  { type: "data_analysis", keywords: ["data", "csv", "dataset", "pandas", "sql", "query", "statistics"] },
  { type: "document_processing", keywords: ["pdf", "document", "extract text", "ocr", "parse"] },
  { type: "image_analysis", keywords: ["image", "photo", "picture", "screenshot", "visual"] },
  { type: "web_search", keywords: ["search the web", "web search", "find online", "latest news", "current"] },
  { type: "planning", keywords: ["plan", "roadmap", "strategy", "schedule", "timeline"] },
  { type: "general_chat", keywords: [] },
];

/**
 * Classify a conversation's task type via keyword/regex heuristics on the
 * last user message.
 *
 * @param {Array} messages - Chat messages array
 * @returns {string} Task type (e.g. "code:generation", "general_chat")
 */
export function classifyTask(messages) {
  let lastUserContent = "";
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "user") {
      if (typeof msg.content === "string") lastUserContent = msg.content;
      else if (Array.isArray(msg.content)) {
        lastUserContent = msg.content
          .filter((c) => c?.type === "text")
          .map((c) => String(c.text || ""))
          .join(" ");
      }
      break;
    }
  }
  if (!lastUserContent.trim()) return "general_chat";

  const lower = lastUserContent.toLowerCase();
  for (const rule of TASK_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return rule.type;
    if (rule.patterns?.some((p) => p.test(lastUserContent))) return rule.type;
  }
  return "general_chat";
}

// ── Model Scoring ───────────────────────────────────────────────────────────

const TASK_WEIGHTS = {
  "code:generation": { tools: 3, reasoning: 2, contextWindow: 2 },
  "code:debugging": { tools: 3, reasoning: 3, contextWindow: 2 },
  "code:review": { tools: 2, reasoning: 3, contextWindow: 2 },
  "agent:multi_step": { tools: 3, reasoning: 3, contextWindow: 3 },
  math: { reasoning: 3 },
  reasoning: { reasoning: 3, contextWindow: 2 },
  research_report: { reasoning: 2, contextWindow: 3, search: 2 },
  creative_writing: { contextWindow: 2 },
  summarization: { contextWindow: 3 },
  translation: { contextWindow: 2 },
  data_analysis: { tools: 2, reasoning: 2, contextWindow: 3 },
  document_processing: { vision: 2, contextWindow: 3 },
  image_analysis: { vision: 3 },
  web_search: { search: 3, contextWindow: 2 },
  planning: { reasoning: 2, contextWindow: 2 },
  general_chat: { contextWindow: 1 },
};

/**
 * Score a model for a given task type.
 *
 * @param {string} provider - Provider id (unused in scoring, kept for API compat)
 * @param {string} modelId - Model id
 * @param {string} taskType - Classified task type
 * @param {number} costQualityTradeoff - 0 (cheapest) to 10 (best quality), default 5
 * @returns {number} Score (>= 0)
 */
export function scoreModel(provider, modelId, taskType, costQualityTradeoff = 5) {
  const weights = TASK_WEIGHTS[taskType] || TASK_WEIGHTS.general_chat;
  let score = 0;

  // Capability fit via name heuristics (engine layer has no DB access).
  // The app layer applies real capability data via getCapabilitiesForModel.
  const lower = String(modelId || "").toLowerCase();
  const hasTools = /tool|function|agent|claude|gpt|gemini|command/i.test(lower);
  const hasReasoning = /reason|think|o1|o3|opus|sonnet|pro|deepseek|r1|qwen|kimi/i.test(lower);
  const hasSearch = /search|web|browse/i.test(lower);
  const hasVision = /vision|vlm|omni|gemini|gpt-4o|claude/i.test(lower);

  if (weights.tools && hasTools) score += weights.tools * 10;
  if (weights.reasoning && hasReasoning) score += weights.reasoning * 10;
  if (weights.search && hasSearch) score += weights.search * 10;
  if (weights.vision && hasVision) score += weights.vision * 10;

  // Context window heuristic (name-based): 200K+ models score higher
  const contextScore = /200k|1m|128k|100k|long|context/i.test(lower) ? 15 : 8;
  score += (weights.contextWindow || 1) * contextScore;

  // Cost heuristic (name-based until real pricing wired in)
  const isExpensive = /opus|pro|max|ultra|premium/i.test(lower);
  const isCheap = /mini|flash|lite|free|cheap|nano/i.test(lower);
  if (costQualityTradeoff > 5 && isExpensive) score -= (costQualityTradeoff - 5) * 5;
  if (costQualityTradeoff > 5 && isCheap) score += (costQualityTradeoff - 5) * 3;
  if (costQualityTradeoff < 5 && isExpensive) score += (5 - costQualityTradeoff) * 3;
  if (costQualityTradeoff < 5 && isCheap) score -= (5 - costQualityTradeoff) * 5;

  return Math.max(0, score);
}

/**
 * Select the top N models for a task from a candidate pool.
 *
 * @param {Array} candidates - [{provider, model, score}] pre-scored candidates
 * @param {number} maxCandidates - Max models to return (default 3)
 * @returns {Array} Top N candidates sorted by score descending
 */
export function selectModels(candidates, maxCandidates = 3) {
  return [...(candidates || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates);
}

// ── Session Stickiness ──────────────────────────────────────────────────────

const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_SESSION_ENTRIES = 500;
const sessionCache = new Map(); // fingerprint → { modelStr, ts, ttlMs }

/**
 * FNV-1a hash of the conversation's first system/user messages.
 * Used as a stable fingerprint for sticky-session lookup.
 *
 * @param {Array} messages - Chat messages
 * @returns {string} 8-char hex fingerprint
 */
export function conversationFingerprint(messages) {
  const parts = [];
  for (const msg of messages || []) {
    if (msg?.role === "system" || msg?.role === "user") {
      let content =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.filter((c) => c?.type === "text").map((c) => String(c.text || "")).join(" ")
            : "";
      parts.push(`${msg.role}:${content.slice(0, 500)}`);
      if (parts.length >= 2) break;
    }
  }
  const str = parts.join("\n");
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Get the sticky session model string for a conversation, if fresh.
 *
 * @param {Array} messages - Chat messages
 * @param {number} ttlMs - TTL override (default 5 min)
 * @returns {string|null} Stored model string or null
 */
export function getStickySession(messages, ttlMs = DEFAULT_SESSION_TTL_MS) {
  const fp = conversationFingerprint(messages);
  const entry = sessionCache.get(fp);
  if (!entry) return null;
  const effectiveTtl = entry.ttlMs || ttlMs;
  if (Date.now() - entry.ts > effectiveTtl) {
    sessionCache.delete(fp);
    return null;
  }
  return entry.modelStr;
}

/**
 * Store a sticky session for a conversation.
 *
 * @param {Array} messages - Chat messages
 * @param {string} modelStr - Model string to store (e.g. "openai/gpt-4o")
 * @param {string|null} provider - Provider slot (kept for API compat; stored
 *   in the modelStr slot when null, mirroring the app-layer contract)
 * @param {number} ttlMs - TTL override (default 5 min)
 */
export function setStickySession(messages, modelStr, provider = null, ttlMs = DEFAULT_SESSION_TTL_MS) {
  const fp = conversationFingerprint(messages);
  // App-layer contract: combo name goes in the provider slot, model null.
  // Engine-layer contract: model string in the modelStr slot.
  const stored = provider != null ? provider : modelStr;
  sessionCache.set(fp, { modelStr: stored, ts: Date.now(), ttlMs });
  if (sessionCache.size > MAX_SESSION_ENTRIES) {
    let oldestKey = null;
    let oldestTs = Infinity;
    for (const [k, v] of sessionCache) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) sessionCache.delete(oldestKey);
  }
}

/**
 * Remove expired session entries. Safe to call periodically to bound memory.
 */
export function cleanupSessions() {
  const now = Date.now();
  for (const [k, v] of sessionCache) {
    if (now - v.ts > (v.ttlMs || DEFAULT_SESSION_TTL_MS)) sessionCache.delete(k);
  }
}

// Periodic cleanup so long-running servers don't accumulate stale entries.
// Unref'd so it never keeps the process alive.
const cleanupTimer = setInterval(cleanupSessions, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();