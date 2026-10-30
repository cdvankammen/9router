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
};

/**
 * Detect which CLI tool is making the request.
 * Returns one of: "claude" | "gemini-cli" | "antigravity" | "codex" | null
 * @param {object} headers - Lowercase header key/value object
 * @param {object} body    - Parsed request body
 */
export function detectClientTool(headers = {}, body = {}) {
  const ua = (headers["user-agent"] || "").toLowerCase();
  const xApp = (headers["x-app"] || "").toLowerCase();
  const openaiIntent = (headers["openai-intent"] || "").toLowerCase();
  const initiator = (headers["x-initiator"] || headers["X-Initiator"] || "").toLowerCase();
  const originator = (headers["originator"] || "").toLowerCase();

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

  // DeepSeek TUI
  if (ua.includes("deepseek-tui")) return "deepseek-tui";

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
