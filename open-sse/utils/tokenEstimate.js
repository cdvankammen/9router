/**
 * Rough prompt-size estimation in tokens, shared by routing decisions
 * (context-aware combo routing) and observability.
 *
 * Heuristic (same family as open-sse/shared/qoder/contextTier.js and the
 * /v1/messages/count_tokens mock):
 *   - CJK characters count ~1 token each (Chinese/Japanese/... are ~1 token
 *     per character, sometimes more — chars/4 alone would undercount by up
 *     to 4x exactly when the decision matters).
 *   - Everything else counts ~4 chars/token.
 *
 * This is intentionally NOT a tokenizer. It is a routing threshold probe:
 * we only need to tell "clearly over ~200K" from "clearly under", and the
 * heuristic is conservative in the risky direction (it never UNDER-estimates
 * badly, so a too-big prompt is never sent to a small-context model).
 */

const CJK_RE = /[\u3000-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;

function count(value, acc) {
  if (value == null) return;
  if (typeof value === "string") {
    acc.chars += value.length;
    const m = value.match(CJK_RE);
    if (m) acc.cjk += m.length;
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    acc.chars += String(value).length;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) count(item, acc);
    return;
  }
  if (typeof value === "object") {
    // Key names cost tokens too (JSON structure)
    for (const [key, item] of Object.entries(value)) {
      acc.chars += key.length;
      count(item, acc);
    }
  }
}

function contentBlockChars(block, acc) {
  if (block == null) return;
  if (typeof block === "string") {
    acc.chars += block.length;
    const m = block.match(CJK_RE);
    if (m) acc.cjk += m.length;
    return;
  }
  if (typeof block !== "object") {
    count(block, acc);
    return;
  }

  switch (block.type) {
    case "text":
      count(block.text, acc);
      break;
    case "tool_use":
      count(block.name, acc);
      count(block.input, acc);
      break;
    case "tool_result":
      count(block.content, acc);
      break;
    case "thinking":
      count(block.thinking, acc);
      break;
    default:
      count(block, acc);
  }
}

function messageChars(message, acc) {
  if (!message || typeof message !== "object") return;
  const content = message.content;

  if (typeof content === "string") {
    acc.chars += content.length;
    const m = content.match(CJK_RE);
    if (m) acc.cjk += m.length;
  } else if (Array.isArray(content)) {
    for (const block of content) contentBlockChars(block, acc);
  } else {
    count(content, acc);
  }
}

/**
 * Estimate the prompt size of a request body in tokens.
 *
 * Handles the message shapes the router actually sees:
 *   - OpenAI / Claude / Hermes: { messages: [...] } (+ system, tools)
 *   - OpenAI Responses API:     { input: [...] } (+ instructions, tools)
 *   - Gemini:                   { contents: [...] } (+ systemInstruction, tools)
 * Any unknown shape falls back to serializing the whole body, so the probe
 * always returns at least a sane conservative number instead of 0.
 *
 * @param {Object} body - incoming request body
 * @returns {number} estimated prompt tokens
 */
export function estimatePromptTokens(body = {}) {
  if (!body || typeof body !== "object") return 0;

  const acc = { chars: 0, cjk: 0 };

  // OpenAI / Anthropic chat format
  if (Array.isArray(body.messages)) {
    count(body.system, acc);
    count(body.tools, acc);
    for (const msg of body.messages) messageChars(msg, acc);
  } else if (Array.isArray(body.input)) {
    // OpenAI Responses format
    count(body.instructions, acc);
    count(body.tools, acc);
    for (const item of body.input) {
      if (typeof item === "string") {
        acc.chars += item.length;
        const m = item.match(CJK_RE);
        if (m) acc.cjk += m.length;
      } else if (item && typeof item === "object") {
        messageChars(item, acc);
      } else {
        count(item, acc);
      }
    }
  } else if (Array.isArray(body.contents)) {
    // Gemini format (parts arrays: each part's .text / .inlineData.data)
    count(body.systemInstruction, acc);
    count(body.tools, acc);
    for (const c of body.contents) {
      if (!c || typeof c !== "object") continue;
      if (Array.isArray(c.parts)) {
        for (const part of c.parts) {
          if (!part || typeof part !== "object") continue;
          count(part.text, acc);
          count(part.inlineData?.data, acc);
          count(part.fileData?.fileUri, acc);
        }
      } else {
        messageChars(c, acc);
      }
    }
  } else {
    // Unknown shape — conservative whole-body fallback
    count(body, acc);
  }

  // Add a small structural overhead per message (role names, separators).
  // Keeps the estimate slightly conservative for large conversations.
  const msgCount =
    (Array.isArray(body.messages) && body.messages.length) ||
    (Array.isArray(body.input) && body.input.length) ||
    (Array.isArray(body.contents) && body.contents.length) ||
    0;
  acc.chars += msgCount * 8;

  // tokens ≈ CJK*1 + (chars - CJK)/4
  return Math.ceil(acc.cjk + (acc.chars - acc.cjk) / 4);
}