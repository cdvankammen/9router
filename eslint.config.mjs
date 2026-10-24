import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Local plugin: flag Chinese literals in dashboard files (would have caught
// the Model Context + Statistics whole-page i18n omissions at author time).
const CHINESE_RE = /[一-龯]/;
const noChineseLiterals = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Chinese characters in string/JSX literals — use i18n keys instead",
    },
    schema: [],
    messages: {
      chineseLiteral: "Chinese literal \"{{text}}\" should be an i18n key (add to public/i18n/literals/*.json).",
    },
  },
  create(context) {
    const check = (node, raw) => {
      if (typeof raw === "string" && CHINESE_RE.test(raw)) {
        const snippet = raw.length > 30 ? raw.slice(0, 30) + "…" : raw;
        context.report({ node, messageId: "chineseLiteral", data: { text: snippet } });
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      JSXText(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        for (const q of node.quasis) check(q, q.value.raw);
      },
    };
  },
};

const localI18nPlugin = {
  meta: { name: "eslint-plugin-local-i18n", version: "1.0.0" },
  rules: { "no-chinese-literals": noChineseLiterals },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Apply no-chinese-literals only to dashboard pages/components.
  {
    files: ["src/app/(dashboard)/dashboard/**/*.js", "src/app/(dashboard)/dashboard/**/*.jsx"],
    plugins: { "local-i18n": localI18nPlugin },
    rules: { "local-i18n/no-chinese-literals": "warn" },
  },
]);

export default eslintConfig;
