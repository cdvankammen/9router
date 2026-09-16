/**
 * ResponseValidator — semantic validation of provider response bodies.
 *
 * Catches "successful" HTTP 200 responses that are actually malformed:
 * empty choices arrays, missing content, finish_reason: "error", HTML error
 * pages, and unparseable JSON. These are NOT transport errors — the request
 * succeeded but the payload is broken, and they must trigger the
 * combo/fallback retry chain instead of being forwarded to the client.
 *
 * Spec: docs/plans-and-prompts/research/9router/34-malformed-response-handling.md
 */

/**
 * Validate a parsed response body for semantic correctness.
 *
 * @param {*} body - Parsed response body (object, string, null, ...)
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function validateResponseBody(body) {
  if (!body) {
    return { valid: false, reasons: ["EMPTY_BODY"] };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, reasons: ["NON_OBJECT_BODY"] };
  }

  const reasons = [];

  // finish_reason: "error" — provider explicitly signaled failure. This is the
  // dominant signal: skip content analysis so the reason list stays precise
  // (an empty-content choice with finish_reason "error" is an error, not a
  // separate NO_CONTENT case).
  if (body.choices?.[0]?.finish_reason === "error") {
    reasons.push("FINISH_REASON_ERROR");
    return { valid: false, reasons };
  }

  // Empty choices array (canonical upstream bug)
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    reasons.push("EMPTY_CHOICES");
  } else {
    const choice = body.choices[0];
    const hasMessageContent =
      choice?.message?.content != null && choice.message.content !== "";
    const hasDeltaContent =
      choice?.delta?.content != null && choice.delta.content !== "";
    const hasToolCalls =
      Array.isArray(choice?.message?.tool_calls) && choice.message.tool_calls.length > 0;
    // No usable content AND no tool calls → malformed
    if (!hasMessageContent && !hasDeltaContent && !hasToolCalls) {
      reasons.push("NO_CONTENT");
    }
  }

  return { valid: reasons.length === 0, reasons };
}

/**
 * Convenience wrapper for callers that want a shouldReject flag.
 *
 * @param {*} body - Parsed response body
 * @returns {{shouldReject: boolean, reasons: string[]}}
 */
export function isMalformedResponse(body) {
  const { valid, reasons } = validateResponseBody(body);
  return { shouldReject: !valid, reasons };
}

/**
 * Best-effort repair of truncated/broken JSON text.
 *
 * Tries strict JSON.parse first; on failure attempts a light repair
 * (trailing-comma tolerance, unquoted keys, single quotes, Python literals).
 * Never throws — returns {ok: false, error: "UNREPAIRABLE"} on failure.
 *
 * @param {string} rawText - Raw response text
 * @returns {{ok: boolean, value?: any, error?: string}}
 */
export function repairBodyText(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { ok: false, error: "EMPTY_TEXT" };
  }
  try {
    return { ok: true, value: JSON.parse(rawText) };
  } catch {
    // fall through to repair
  }
  try {
    // Lightweight repair: strip markdown fences, tolerate trailing commas,
    // convert Python literals (None/True/False/NaN) to JSON equivalents.
    let text = rawText.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    text = text.replace(/,\s*([}\]])/g, "$1");
    text = text.replace(/\bNone\b/g, "null").replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");
    text = text.replace(/\bNaN\b/g, "null");
    // Single-quoted strings → double-quoted (best-effort, no escapes inside)
    text = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (m, inner) => `"${inner.replace(/"/g, '\\"')}"`);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "UNREPAIRABLE" };
  }
}