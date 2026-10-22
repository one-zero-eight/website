import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "ru", "pseudo-LOCALE"],
  pseudoLocale: { locale: "pseudo-LOCALE" },
  fallbackLocales: {
    "pseudo-LOCALE": "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["src"],
      exclude: [
        "src/components/schedule-assistant/**",
        "src/app/routes/schedule-assistant/**",
        "src/app/routes/timetable.tsx",
      ],
    },
  ],
});
