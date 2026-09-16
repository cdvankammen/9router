/**
 * Source-app fingerprinting from User-Agent strings.
 *
 * Maps a raw User-Agent to a stable "source app" class — the single
 * highest-value filter dimension for "which client is hitting the gateway".
 * Never stores the raw UA (privacy: it can fingerprint a person's exact
 * toolchain); only the class is persisted (see research D.4).
 *
 * Research source: message-viewer-design-philosophies.md §B.3
 */

const UA_RULES = [
  // Order matters — most specific first.
  { re: /claude[-_ ]code\//i, app: "Claude Code" },
  { re: /claude-code/i, app: "Claude Code" },
  { re: /cursor\//i, app: "Cursor" },
  { re: /codex-cli|codex\//i, app: "Codex CLI" },
  // Codex CLI's Android companion identifies via "codex droid"/"CodexDroid" —
  // a BARE /droid/i would also catch ordinary mobile-browser UAs ("Android 13")
  // and misclassify them as Codex CLI. Require codex adjacency.
  { re: /codex[ _-]?droid|droid[ _-]?codex/i, app: "Codex CLI" },
  { re: /githubcopilot|copilot-chat/i, app: "GitHub Copilot" },
  { re: /openai\/js/i, app: "OpenAI JS SDK" },
  { re: /openai\/python/i, app: "OpenAI Python SDK" },
  { re: /langchainjs|langchain\//i, app: "LangChain" },
  { re: /vercel-ai-sdk|ai-sdk/i, app: "Vercel AI SDK" },
  { re: /openwebui/i, app: "Open WebUI" },
  { re: /litellm/i, app: "LiteLLM" },
  { re: /lobechat/i, app: "LobeChat" },
  { re: /cherrystudio/i, app: "Cherry Studio" },
  { re: /librechat/i, app: "LibreChat" },
  { re: /pycharm|jetbrains/i, app: "JetBrains" },
  { re: /continue\//i, app: "Continue" },
  // Governance M1 additions (plan M3): Aider, Cline, Roo Code, Windsurf,
  // Zed, Warp, OpenRouter SDK.
  { re: /aider/i, app: "Aider" },
  { re: /cline/i, app: "Cline" },
  { re: /roo[-_ ]?code/i, app: "Roo Code" },
  { re: /windsurf/i, app: "Windsurf" },
  { re: /zed/i, app: "Zed" },
  { re: /warp/i, app: "Warp" },
  { re: /openrouter/i, app: "OpenRouter SDK" },
  { re: /^curl\//i, app: "curl" },
  { re: /node-fetch|undici/i, app: "Node fetch" },
  { re: /axios/i, app: "axios" },
  { re: /postman/i, app: "Postman" },
  { re: /insomnia/i, app: "Insomnia" },
  { re: /hoppscotch/i, app: "Hoppscotch" },
  { re: /9router/i, app: "9Router" },
];

const DEFAULT_APP = "unknown";

/**
 * Fingerprint a User-Agent string into a stable source-app class.
 * @param {string|undefined|null} userAgent
 * @returns {string} e.g. "Claude Code", "OpenAI JS SDK", "curl", "unknown"
 */
export function fingerprintSourceApp(userAgent) {
  if (!userAgent || typeof userAgent !== "string") return DEFAULT_APP;
  const ua = userAgent.slice(0, 300); // cap; never store the full UA
  for (const rule of UA_RULES) {
    if (rule.re.test(ua)) return rule.app;
  }
  // Fallback: browser UAs
  if (/mozilla/i.test(ua)) return "Browser";
  return DEFAULT_APP;
}

/**
 * Register a custom UA → app rule (for tests / future additions).
 * @param {RegExp} re
 * @param {string} app
 */
export function addSourceAppRule(re, app) {
  UA_RULES.push({ re, app });
}
