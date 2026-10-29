// Claude Code and similar clients append a bracketed context marker to the
// model name to signal a context-window tier: `claude-opus-5` becomes
// `claude-opus-5[1m]` (1M beta) or `claude-opus-5[200k]` (200K tier).
// The marker is a client-side annotation, not part of any model id: it never
// matches a combo name, an alias or a `provider/model` pair, so a request that
// carries it dies at model resolution with "Invalid model format".
//
// The capability itself travels in the `anthropic-beta` header, which is
// forwarded untouched — stripping the marker is enough to let the request
// route normally and still reach the upstream with the correct context tier.

// Matches trailing [1m], [200k], [500k], [128k], [1M] etc. — a number
// optionally followed by a size suffix (k, m), inside brackets, at end of string.
const CONTEXT_MARKER = /\[(\d+[kKmM]?)\]\s*$/;

// Returns { model, contextMarker } — contextMarker is null when there is none.
// contextMarker contains the raw inner value (e.g. "1m", "200k") lowercase.
export function stripModelContextMarker(modelStr) {
  if (typeof modelStr !== "string") return { model: modelStr, contextMarker: null };
  const trimmed = modelStr.trim();
  const match = trimmed.match(CONTEXT_MARKER);
  if (!match) return { model: modelStr, contextMarker: null };
  return { model: trimmed.slice(0, -match[0].length), contextMarker: match[1].toLowerCase() };
}
