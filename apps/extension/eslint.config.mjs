import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist/**", "release/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { chrome: "readonly", console: "readonly", window: "readonly", document: "readonly",
                 setTimeout: "readonly", clearTimeout: "readonly", fetch: "readonly",
                 URL: "readonly", MutationObserver: "readonly", CustomEvent: "readonly",
                 HTMLElement: "readonly", Element: "readonly", process: "readonly" },
    },
  },
)
