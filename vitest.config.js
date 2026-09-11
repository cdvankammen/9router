import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "open-sse": path.resolve(__dirname, "open-sse"),
    },
  },
  test: {
    include: ["tests/**/*.test.js"],
    globals: false,
  },
});
