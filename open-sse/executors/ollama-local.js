import { DefaultExecutor } from "./default.js";
import { resolveOllamaLocalHost } from "../config/providers.js";

export class OllamaLocalExecutor extends DefaultExecutor {
  constructor() {
    super("ollama-local");
  }

  buildUrl(model, stream, urlIndex = 0, credentials = null) {
    const host = resolveOllamaLocalHost(credentials);
    // Streaming: use ollama's OpenAI-compatible endpoint (/v1/chat/completions),
    // which emits real `text/event-stream` SSE. Ollama's native /api/chat
    // streaming returns application/x-ndjson, which the SSE pipeline blocks.
    return stream ? `${host}/v1/chat/completions` : `${host}/api/chat`;
  }

  async execute(args) {
    const result = await super.execute(args);
    if (args.stream) {
      // /v1/chat/completions responds in OpenAI format — tell chatCore to
      // treat the SSE stream as the openai pivot format (native SSE handling).
      result.responseFormat = "openai";
    }
    return result;
  }
}

export default OllamaLocalExecutor;
