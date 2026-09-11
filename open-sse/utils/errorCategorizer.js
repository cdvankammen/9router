/**
 * Error categorization — classifies upstream failures into stable categories
 * from status code + error text. Pure function, no deps.
 *
 * Categories: rate_limit | auth | billing | timeout | overloaded |
 *             content_filter | invalid_request | network | unknown
 */

const RULES = [
  {
    category: "rate_limit",
    statuses: [429],
    patterns: [
      /rate\s*limit/i, /too\s*many\s*requests/i, /quota\s*exceeded/i,
      /retry\s*after/i, /requests\s*per\s*(minute|day|hour)/i, /over\s*quota/i,
    ],
  },
  {
    category: "auth",
    statuses: [401, 403],
    patterns: [
      /unauthori[sz]ed/i, /invalid\s*api\s*key/i, /authentication/i,
      /permission/i, /forbidden/i, /api\s*key.*(invalid|missing|expired)/i,
      /access\s*denied/i, /token.*(invalid|expired|revoked)/i,
    ],
  },
  {
    category: "billing",
    statuses: [402],
    patterns: [
      /billing/i, /payment/i, /insufficient\s*quota/i, /balance/i,
      /upgrade\s*plan/i, /no\s*active\s*plan/i, /payment\s*required/i,
    ],
  },
  {
    category: "timeout",
    statuses: [408, 504],
    patterns: [
      /time\s*out/i, /timed\s*out/i, /gateway\s*timeout/i, /request\s*timed/i,
      /ECONNRESET/i, /socket\s*hang/i,
    ],
  },
  {
    category: "overloaded",
    statuses: [503],
    patterns: [
      /overloaded/i, /service\s*unavailable/i, /busy/i, /capacity/i,
      /temporarily\s*unavailable/i, /maintenance/i, /over\s*capacity/i,
    ],
  },
  {
    category: "content_filter",
    statuses: [400, 451],
    patterns: [
      /content\s*(filter|policy|moderation)/i, /safety\s*system/i,
      /moderation/i, /policy\s*violation/i, /flagged/i, /harmful\s*content/i,
      /refus(e|ed)\s*to\s*respond/i, /not\s*allowed\s*to\s*(produce|generate)/i,
    ],
  },
  {
    category: "invalid_request",
    statuses: [400, 404, 405, 422],
    patterns: [
      /invalid/i, /bad\s*request/i, /not\s*found/i, /unsupported/i,
      /malformed/i, /missing\s*(parameter|field)/i, /invalid\s*model/i,
      /does\s*not\s*exist/i,
    ],
  },
  {
    category: "network",
    statuses: [],
    patterns: [
      /fetch\s*failed/i, /ENOTFOUND/i, /ECONNREFUSED/i, /EAI_AGAIN/i,
      /ETIMEDOUT/i, /socket\s*hang\s*up/i, /network\s*error/i,
      /certificate/i, /self[- ]signed/i, /unable\s*to\s*connect/i,
    ],
  },
  {
    category: "empty_response",
    statuses: [200],
    patterns: [
      /empty\s*(stream|response|chunk)/i, /zero\s*content/i,
      /no\s*content\s*received/i, /stream\s*completed\s*with\s*no/i,
    ],
  },
];

/**
 * Classify an upstream error into a stable category.
 * @param {number|null} status - HTTP status code (or null/undefined)
 * @param {string|null} text - Error message text (or null/undefined)
 * @returns {string} One of the stable category names
 */
export function categorizeError(status, text) {
  const s = Number(status) || 0;
  const t = String(text || "");

  for (const rule of RULES) {
    // Status match is decisive for well-known codes
    if (rule.statuses.includes(s)) return rule.category;
    // Text match with a known-code status also counts (e.g. 400 + "rate limit")
    for (const pattern of rule.patterns) {
      if (pattern.test(t)) return rule.category;
    }
  }

  // Fallbacks for statuses outside the rules
  if (s >= 500) return "overloaded";
  if (s >= 400) return "invalid_request";
  return "unknown";
}
