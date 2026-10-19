import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "ru", "pseudo-LOCALE"],
  pseudoLocale: { locale: "pseudo-LOCALE" },
  fallbackLocales: {
    "pseudo-LOCALE": "ru",
  },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["src"],
    },
  ],
});
