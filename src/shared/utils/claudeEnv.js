// Pure helpers for the claude default-model mapping (endpoint page →
// one-click write into ~/.claude/settings.json env). No imports — safe for
// both server routes and client bundles.
//
// Semantics (strict): the write is a key-overwrite on env only —
// env = { ...current, ...overrides }. Keys absent from the overrides are
// never deleted and no non-env key is ever touched.

export const CLAUDE_ROLE_KEYS = ["sonnet", "opus", "fable", "haiku"];

export function emptyClaudeDefaults() {
  const d = {};
  for (const role of CLAUDE_ROLE_KEYS) d[role] = { model: "", name: "", oneM: false };
  // Subagent (Task tool) model — has no /model-menu presence, so no name.
  d.subagent = { model: "", oneM: false };
  return d;
}

// Sanitize a defaultModels blob (dashboard body or persisted settings).
// Unknown shapes fall back to empty strings so a malformed payload can never
// inject weird env values into the user's settings.json.
export function sanitizeDefaultModels(raw) {
  const clean = emptyClaudeDefaults();
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  for (const role of CLAUDE_ROLE_KEYS) {
    const src = raw?.[role] || {};
    clean[role] = { model: str(src.model), name: str(src.name), oneM: src.oneM === true };
  }
  const sa = raw?.subagent || {};
  clean.subagent = { model: str(sa.model), oneM: sa.oneM === true };
  return clean;
}

// Pure mapping: defaultModels → env overrides object (no deletes — an empty
// role contributes no keys, leaving existing env values intact). Suffix is
// [1M] (uppercase, matching cc-switch). A role without a display name omits
// its _MODEL_NAME key. The subagent row maps to CLAUDE_CODE_SUBAGENT_MODEL.
export function buildClaudeEnvOverrides(defaultModels) {
  const set = {};
  const withSuffix = (model, oneM) => (oneM ? `${model}[1M]` : model);
  for (const role of CLAUDE_ROLE_KEYS) {
    const cfg = defaultModels?.[role] || {};
    if (!cfg.model) continue;
    set[`ANTHROPIC_DEFAULT_${role.toUpperCase()}_MODEL`] = withSuffix(cfg.model, cfg.oneM);
    if (cfg.name) set[`ANTHROPIC_DEFAULT_${role.toUpperCase()}_MODEL_NAME`] = cfg.name;
  }
  if (defaultModels?.subagent?.model) {
    set.CLAUDE_CODE_SUBAGENT_MODEL = withSuffix(defaultModels.subagent.model, defaultModels.subagent.oneM);
  }
  return set;
}

// SECURITY (#294): deny-list of env var names that, if injected into
// ~/.claude/settings.json, would give an attacker code execution when
// Claude Code runs. Sources: attacker-controlled dashboard PATCH, XSS
// chain through ChangelogModal (#265), CSRF (#264). The deny-list is
// conservative — we'd rather block one legitimate key than allow RCE.
// Key matching is case-insensitive (keys normalized to uppercase before
// comparison) and also covers prefix matches for families like LD_* and
// DYLD_*.
const DENY_ENV_KEYS_EXACT = new Set([
  // Dynamic linker / runtime injection
  "LD_PRELOAD", "LD_AUDIT", "LD_LIBRARY_PATH", "LD_DEBUG",
  "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH", "DYLD_FALLBACK_LIBRARY_PATH",
  // Node.js / V8 code-exec knobs
  "NODE_OPTIONS", "NODE_PATH", "NODE_REPL_HISTORY_FILE",
  "NODE_INSPECT_BRK", "NODE_INSPECT", "UV_THREADPOOL_SIZE",
  // Shell / path
  "PATH", "BASH_ENV", "ENV", "SHELL", "IFS", "PS1", "PROMPT_COMMAND",
  "CDPATH", "HOSTALIASES",
  // Other language runtime paths
  "PERL5LIB", "PERLLIB", "PYTHONPATH", "RUBYLIB", "GEM_HOME", "GEM_PATH",
  "CLASSPATH", "JAVA_TOOL_OPTIONS", "MAVEN_OPTS",
  // TLS / crypto hook points
  "OPENSSL_CONF", "SSLKEYLOGFILE",
  // Git code-exec hooks
  "GIT_EXTERNAL_DIFF", "GIT_SSH_COMMAND", "GIT_SSH", "GIT_ASKPASS",
  "GIT_EXEC_PATH", "GIT_TEMPLATE_DIR", "GIT_CONFIG", "GIT_CONFIG_GLOBAL",
  // Proxy / network (could MITM Claude's own outbound requests)
  "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy",
  // Misc dangerous hook points
  "TERMINFO_DIRS", "TERMCAP", "RES_OPTIONS", "LOCALDOMAIN",
]);
// Prefixes that must never be settable — matched as startsWith on the
// uppercased key.
const DENY_ENV_KEY_PREFIXES = [
  "LD_", "DYLD_", "BASH_FUNC_", "PROMPT_COMMAND", "ENV_",
];

function isEnvKeyAllowed(key) {
  if (typeof key !== "string") return false;
  const upper = key.toUpperCase();
  if (DENY_ENV_KEYS_EXACT.has(upper)) return false;
  for (const prefix of DENY_ENV_KEY_PREFIXES) {
    if (upper.startsWith(prefix)) return false;
  }
  return true;
}

// Coerce a user-edited env JSON blob into a clean {string: string} map.
// Strings pass through; numbers/booleans stringify; null/objects/arrays are
// dropped. Dangerous keys (LD_PRELOAD, NODE_OPTIONS, PATH, etc.) are
// silently stripped — see deny-list rationale above.
export function sanitizeEnvOverrides(raw) {
  const clean = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return clean;
  for (const [k, v] of Object.entries(raw)) {
    if (!isEnvKeyAllowed(k)) continue;
    if (typeof v === "string") clean[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") clean[k] = String(v);
  }
  return clean;
}

// Exposed for unit tests and UI hints.
export const CLAUDE_ENV_DENY_KEYS = Object.freeze({
  exact: [...DENY_ENV_KEYS_EXACT],
  prefixes: [...DENY_ENV_KEY_PREFIXES],
  isAllowed: isEnvKeyAllowed,
});

// Strict key-overwrite merge into a parsed settings.json object. Only env
// keys present in overrides change; every other env key and all non-env
// top-level keys survive verbatim.
export function mergeClaudeEnv(settingsJson, envOverrides) {
  return { ...settingsJson, env: { ...(settingsJson?.env || {}), ...envOverrides } };
}
