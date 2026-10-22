import REGISTRY from "../providers/registry/index.js";

// Alias→id derived from registry single-source: id→id, alias→id, aliases[]→id.
// Media-only providers without a registry transport entry keep explicit aliases here.
const MEDIA_ONLY_ALIASES = {
  el: "elevenlabs",
  jina: "jina-ai",
  "jina-ai": "jina-ai",
  polly: "aws-polly",
  "aws-polly": "aws-polly",
};

const ALIAS_TO_PROVIDER_ID = { ...MEDIA_ONLY_ALIASES };
for (const entry of REGISTRY) {
  ALIAS_TO_PROVIDER_ID[entry.id] = entry.id;
  if (entry.alias) ALIAS_TO_PROVIDER_ID[entry.alias] = entry.id;
  for (const a of entry.aliases || []) ALIAS_TO_PROVIDER_ID[a] = entry.id;
}

const BUILTIN_MODEL_ALIASES = {
  "grok-build": "gcli/grok-build",
};

/**
 * Resolve provider alias to provider ID
 */
export function resolveProviderAlias(aliasOrId) {
  return ALIAS_TO_PROVIDER_ID[aliasOrId] || aliasOrId;
}

/**
 * Strip known beta/context-window markers appended by clients.
 * Claude Code 1M-context beta sends e.g. "claude-sonnet-4[1m]"; older betas
 * used "[200k]". The marker is a client-side hint — we strip it so the model
 * lookup succeeds, and optionally surface it via the returned `betaMarker`
 * field so downstream handlers can enable extended-context behaviour.
 *
 * Pattern: trailing `[<digits><k|m>]` (case-insensitive), e.g. [1m], [200k].
 * Only strips when the bracket group sits at the END of the string so we
 * don't accidentally eat legitimate model-name characters.
 */
const BETA_MARKER_RE = /\[(\d+[km])\]$/i;

export function stripBetaMarker(modelStr) {
  if (!modelStr || typeof modelStr !== "string") return { cleaned: modelStr, betaMarker: null };
  const m = modelStr.match(BETA_MARKER_RE);
  if (!m) return { cleaned: modelStr, betaMarker: null };
  return {
    cleaned: modelStr.slice(0, -m[0].length),
    betaMarker: m[1].toLowerCase(), // e.g. "1m", "200k"
  };
}

/**
 * Parse model string: "alias/model" or "provider/model" or just alias
 */
export function parseModel(modelStr) {
  if (!modelStr) {
    return { provider: null, model: null, isAlias: false, providerAlias: null, betaMarker: null };
  }

  // Strip beta context-window markers before any further parsing (#3690)
  const { cleaned, betaMarker } = stripBetaMarker(modelStr);
  modelStr = cleaned;

  // Check if standard format: provider/model or alias/model
  if (modelStr.includes("/")) {
    const firstSlash = modelStr.indexOf("/");
    const providerOrAlias = modelStr.slice(0, firstSlash);
    const model = modelStr.slice(firstSlash + 1);
    const provider = resolveProviderAlias(providerOrAlias);
    return { provider, model, isAlias: false, providerAlias: providerOrAlias, betaMarker };
  }

  // Alias format (model alias, not provider alias)
  return {
    provider: null,
    model: modelStr,
    isAlias: true,
    providerAlias: null,
    betaMarker,
  };
}

/**
 * Resolve model alias from aliases object
 * Format: { "alias": "provider/model" }
 */
export function resolveModelAliasFromMap(alias, aliases) {
  if (!aliases) return null;

  // Check if alias exists
  const resolved = aliases[alias];
  if (!resolved) return null;

  // Resolved value is "provider/model" format
  if (typeof resolved === "string" && resolved.includes("/")) {
    const firstSlash = resolved.indexOf("/");
    const providerOrAlias = resolved.slice(0, firstSlash);
    return {
      provider: resolveProviderAlias(providerOrAlias),
      model: resolved.slice(firstSlash + 1),
    };
  }

  // Or object { provider, model }
  if (typeof resolved === "object" && resolved.provider && resolved.model) {
    return {
      provider: resolveProviderAlias(resolved.provider),
      model: resolved.model,
    };
  }

  return null;
}

/**
 * Get full model info (parse or resolve)
 * @param {string} modelStr - Model string
 * @param {object|function} aliasesOrGetter - Aliases object or async function to get aliases
 */
export async function getModelInfoCore(modelStr, aliasesOrGetter) {
  const parsed = parseModel(modelStr);

  if (!parsed.isAlias) {
    return {
      provider: parsed.provider,
      model: parsed.model,
      betaMarker: parsed.betaMarker,
    };
  }

  // Get aliases (from object or function)
  const aliases =
    typeof aliasesOrGetter === "function"
      ? await aliasesOrGetter()
      : aliasesOrGetter;

  // Resolve alias
  const resolved =
    resolveModelAliasFromMap(parsed.model, aliases) ||
    resolveModelAliasFromMap(parsed.model, BUILTIN_MODEL_ALIASES);
  if (resolved) {
    return resolved;
  }

  // Fallback: infer provider from model name prefix
  return {
    provider: inferProviderFromModelName(parsed.model),
    model: parsed.model,
    betaMarker: parsed.betaMarker,
  };
}

// Config-driven prefix → provider inference (first match wins, fallback "openai").
// Ollama-local models are served REMOTELY (model-serving policy: never on the
// control-plane Mac — see OLLAMA_LOCAL_DEFAULT_HOST in config/providers.js).
const MODEL_PREFIX_PROVIDERS = [
  // Codex CLI sends this bare virtual model for auto-review - keep it on OAuth Codex (#1398).
  [/^codex-auto-review$/, "codex"],
  // Codex-only GPT model slugs: present in backend-api/codex/models but not on the
  // OpenAI API.  Without these rules a bare model id (e.g. "gpt-5.6-terra" from the
  // Codex CLI /model picker) resolves to provider "openai", which 404s for users that
  // only have a Codex OAuth account and no OpenAI API key (#4405).
  // Ranges covered: gpt-5.x, gpt-6.x, gpt-daybreak-*, gpt-reserve* — all are
  // Codex-backend models.  Plain "gpt-4*" / "gpt-3.5*" / "gpt-4o*" fall through to
  // the generic gpt-* → openai rule below.
  [/^gpt-[56]\./, "codex"],
  [/^gpt-6-/, "codex"],
  [/^gpt-daybreak-/, "codex"],
  [/^gpt-reserve/, "codex"],
  [/^claude-/, "anthropic"],
  [/^gemini-/, "gemini"],
  [/^gpt-/, "openai"],
  [/^o[134]/, "openai"],
  [/^deepseek-/, "openrouter"],
  [/^qwen2\.5/, "ollama-local"],
  [/^llama3\./, "ollama-local"],
];

/**
 * Infer provider from model name prefix
 * Used as fallback when no provider prefix or alias is given
 */
function inferProviderFromModelName(modelName) {
  if (!modelName) return "openai";
  const m = modelName.toLowerCase();
  return MODEL_PREFIX_PROVIDERS.find(([re]) => re.test(m))?.[1] || "openai";
}
