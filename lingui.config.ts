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
        "src/components/schedule-assistant/{bookings,checks,config,preferences}/**",
        "src/components/schedule-assistant/settings/*/**",
        "src/components/schedule-assistant/settings/!(weekdays).{ts,tsx}",
        "src/components/schedule-assistant/{CopyableTextModal,DetailFullscreenModal,MainFloatingMenu}.tsx",
        "src/app/routes/schedule-assistant/**",
      ],
    },
  ],
});
