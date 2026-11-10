import js from "@eslint/js";
import pluginLingui from "eslint-plugin-lingui";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const commonRestrictedImports = [
  {
    name: "@lingui/macro",
    message:
      "Use @lingui/react/macro (JSX) or @lingui/core/macro (JS) instead.",
  },
];

export default tseslint.config(
  { ignores: ["dist/**", "build/**", "coverage/**"] },
  {
    ...pluginLingui.configs["flat/recommended"],
    files: ["src/**/*.{js,jsx,ts,tsx}", "tests/service-worker/**/*.test.ts"],
  },
  {
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
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/service-worker/**/*.test.ts"],
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...commonRestrictedImports,
            {
              name: "@tanstack/react-router",
              importNames: ["useBlocker"],
              message:
                "Use useAutoUpdateBlocker from @/app/use-auto-update-blocker.ts instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/use-auto-update-blocker.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: commonRestrictedImports }],
    },
  },
);
