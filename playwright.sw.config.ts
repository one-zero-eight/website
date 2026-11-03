import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/service-worker",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5201",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node e2e/service-worker/server.mjs",
    url: "http://127.0.0.1:5201/",
    reuseExistingServer: false,
    timeout: 360_000,
  },
});
