import { defineConfig, devices } from "@playwright/test";

const e2eBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5199";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: e2eBaseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chrome",
      testMatch: "**/tiptap/editor.desktop.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chrome",
      testMatch: "**/tiptap/editor.mobile.spec.ts",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "pnpm exec vite --config vite.e2e.config.ts",
    url: `${e2eBaseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
