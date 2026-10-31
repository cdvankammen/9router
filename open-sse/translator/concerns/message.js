import { OPENAI_BLOCK } from "../schema/index.js";

// Collapse an OpenAI content-part array to its simplest form:
// - All-text arrays → single newline-joined string (matches OpenAI's string content form,
//   required by clients that expect `content` to be a string when only text is present).
// - Mixed (text + image, etc.) → array as-is.
// - Empty array → empty string (some providers reject empty arrays).
export function collapseTextParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return "";
  if (parts.every(p => p?.type === OPENAI_BLOCK.TEXT)) {
    return parts.map(p => p.text || "").join("\n");
  }
  return parts;
}
