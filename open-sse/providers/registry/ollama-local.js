export default {
  id: "ollama-local",
  priority: 50,
  hasFree: true,
  noAuth: true, // keyless — virtual connection injected by auth.js (FREE_PROVIDERS)
  alias: "ollama-local",
  display: {
    name: "Ollama Local",
    icon: "cloud",
    color: "#ffffffff",
    textIcon: "OL",
    website: "https://ollama.com",
  },
  category: "free", // "free" category → FREE_PROVIDERS → noAuth virtual connection
  transport: {
    baseUrl: "http://localhost:11434/api/chat",
    format: "ollama",
  },
  serviceKinds: ["llm"],
};
