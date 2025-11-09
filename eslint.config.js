import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config({
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  plugins: {
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
  },
  ignores: ["__generated__"],
  files: ["src/**/*.ts", "src/**/*.tsx"],
  rules: {
    ...reactHooks.configs.recommended.rules,
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        // Allow underscore
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/purity": "off",
    "react-hooks/refs": "off", // floating-ui refs give too much false positives
  },
});
