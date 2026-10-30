/**
 * Detect CLI tool identity from request headers/body.
 * Used to determine if a request can be passed through losslessly.
 */

// Map of CLI tool identifiers to provider IDs they are "native" to
const NATIVE_PAIRS = {
  "claude": ["claude", "anthropic"],
  "gemini-cli": ["gemini-cli"],
  "antigravity": ["antigravity"],
  "codex": ["codex"],
  "aider": ["aider"],
  "cline": ["cline"],
  "roo-code": ["roo-code"],
  "windsurf": ["windsurf"],
  "zed": ["zed"],
  "warp": ["warp"],
  "continue": ["continue"],
  "openrouter-sdk": ["openrouter-sdk"],
};

/**
 * Detect which CLI tool is making the request.
 * Returns one of: "claude" | "gemini-cli" | "antigravity" | "codex" | "aider" | "cline" | "roo-code" | "windsurf" | "zed" | "warp" | "continue" | "openrouter-sdk" | "github-copilot" | "deepseek-tui" | null
 * @param {object} headers - Lowercase header key/value object
 * @param {object} body    - Parsed request body
 */
export function detectClientTool(headers = {}, body = {}) {
  const ua = (headers["user-agent"] || "").toLowerCase();
  const xApp = (headers["x-app"] || "").toLowerCase();
  const openaiIntent = (headers["openai-intent"] || "").toLowerCase();
  const initiator = (headers["x-initiator"] || headers["X-Initiator"] || "").toLowerCase();
  const originator = (headers["originator"] || "").toLowerCase();

  // Trusted identity headers (governance M1) — only honored post-auth.
  // These are set by the gateway after validating the API key, so they
  // cannot be spoofed by the client. The gateway strips untrusted
  // X-9R-* headers at the edge and re-injects verified ones.
  const trustedApp = headers["x-9r-app"] || headers["x-9router-app"];
  const trustedUser = headers["x-9r-user"] || headers["x-9router-user"];
  const trustedSession = headers["x-9r-session"] || headers["x-9router-session"];

  // Antigravity: detected via body field (not header)
  if (body.userAgent === "antigravity") return "antigravity";

  // GitHub Copilot / OAI compatible extension using Copilot chat headers
  if (ua.includes("githubcopilotchat") || openaiIntent === "conversation-panel" || initiator === "user") {
    return "github-copilot";
  }

  // Claude Code / Claude CLI
  if (ua.includes("claude-cli") || ua.includes("claude-code") || xApp === "cli") return "claude";

  // Gemini CLI
  if (ua.includes("gemini-cli")) return "gemini-cli";

  // Codex CLI/Desktop — codex-tui is the current Rust CLI, codex-cli/codex_cli_rs legacy;
  // Codex Desktop identifies via UA "Codex Desktop" or originator "codex_work_desktop"
  if (ua.includes("codex-tui") || ua.includes("codex-cli") || ua.includes("codex_cli_rs") ||
      ua.includes("codex desktop") || originator.startsWith("codex_")) return "codex";

  // Aider
  if (ua.includes("aider")) return "aider";

  // Cline
  if (ua.includes("cline")) return "cline";

  // Roo Code
  if (ua.includes("roo-code") || ua.includes("roocode")) return "roo-code";

  // Windsurf
  if (ua.includes("windsurf")) return "windsurf";

  // Zed
  if (ua.includes("zed")) return "zed";

  // Warp
  if (ua.includes("warp")) return "warp";

  // Continue
  if (ua.includes("continue")) return "continue";

  // OpenRouter SDK
  if (ua.includes("openrouter") || ua.includes("openrouter-sdk")) return "openrouter-sdk";

  // DeepSeek TUI
  if (ua.includes("deepseek-tui")) return "deepseek-tui";

  // Trusted headers override UA detection (governance M1)
  if (trustedApp) return trustedApp;

  return null;
}

/**
 * Detect IDE from User-Agent (M3).
 * Returns one of: "vscode" | "jetbrains" | "neovim" | "zed" | "warp" | "terminal" | null
 * @param {string} ua - Lowercase User-Agent string
 */
export function detectIDE(ua) {
  if (!ua || typeof ua !== "string") return null;
  const lower = ua.toLowerCase();

  // VS Code (including Cursor, GitHub Codespaces, etc.)
  if (lower.includes("vscode") || lower.includes("code ") || lower.includes("github-codespaces")) {
    return "vscode";
  }

  // JetBrains IDEs (IntelliJ, PyCharm, WebStorm, etc.)
  if (lower.includes("jetbrains") || lower.includes("intellij") || lower.includes("pycharm") ||
      lower.includes("webstorm") || lower.includes("rider") || lower.includes("goland") ||
      lower.includes("clion") || lower.includes("datagrip") || lower.includes("rubymine") ||
      lower.includes("phpstorm")) {
    return "jetbrains";
  }

  // Neovim
  if (lower.includes("neovim") || lower.includes("nvim")) {
    return "neovim";
  }

  // Zed (already caught as client tool, but also an IDE)
  if (lower.includes("zed")) {
    return "zed";
  }

  // Warp (terminal)
  if (lower.includes("warp")) {
    return "warp";
  }

  // Generic terminal (curl, wget, httpie, etc. — no IDE)
  if (lower.includes("curl") || lower.includes("wget") || lower.includes("httpie") ||
      lower.includes("axios") || lower.includes("node-fetch") || lower.includes("undici")) {
    return "terminal";
  }

  return null;
}

/**
 * Check if this CLI tool + provider pair should be passed through losslessly.
 * @param {string|null} clientTool - Result of detectClientTool()
 * @param {string} provider        - Provider ID (e.g. "claude", "gemini-cli")
 */
export function isNativePassthrough(clientTool, provider) {
  if (!clientTool) return false;
  const nativeProviders = NATIVE_PAIRS[clientTool];
  if (!nativeProviders) return false;
  // Support anthropic-compatible-* variants
  const normalizedProvider = provider.startsWith("anthropic-compatible")
    ? "anthropic"
    : provider;
  return nativeProviders.includes(normalizedProvider);
}
