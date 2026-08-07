/**
 * Fallback-rule text format helpers (shared by the dashboard text editor and
 * its unit tests).
 *
 * The text format is one rule per line:
 *   target:fallback1,fallback2
 * where `target` is either "provider/model" or a bare provider id.
 * Lines starting with # are comments.
 *
 * Storage shapes handled:
 *   legacy:   { target: ["m1", "m2"] }
 *   advanced: { target: { models: ["m1", "m2"], retries: N, perModelRetries } }
 */

/** Extract the model list from either storage shape. */
export function ruleModels(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.models)) return value.models;
  return [];
}

/** Is the stored value the advanced shape? */
export function isAdvancedRule(value) {
  return !Array.isArray(value) && !!value && typeof value === "object" && Array.isArray(value.models);
}

/**
 * Convert the settings map into editable text lines (model list only).
 * Advanced rules keep their retry config on re-parse via parseDraftText,
 * so nothing is silently lost by round-tripping through the text editor.
 */
export function toDraftText(map) {
  return Object.entries(map || {})
    .map(([target, fbs]) => `${target}:${ruleModels(fbs).join(",")}`)
    .join("\n");
}

/**
 * Parse textarea lines into the settings map. When a rule already exists in
 * the advanced shape, its retries/perModelRetries are preserved (only the
 * chain is edited by the text format).
 */
export function parseDraftText(text, existing = {}) {
  const out = {};
  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep <= 0) continue;
    const target = line.slice(0, sep).trim();
    const fallbacks = line
      .slice(sep + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!target || fallbacks.length === 0) continue;

    const prev = existing[target];
    if (isAdvancedRule(prev)) {
      out[target] = { ...prev, models: fallbacks };
    } else {
      out[target] = fallbacks;
    }
  }
  return out;
}
