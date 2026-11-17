import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/service-worker",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:5201",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    // Firefox cancels a worker's response after about 60 s, while it waits 90 s
    // for a silent server: the fallbacks for such a server are checked there.
    // Not devices["Desktop Firefox"]: its user agent override makes Firefox
    // send a CORS preflight for every request the worker repeats.
    { name: "firefox", use: { browserName: "firefox" }, grep: /@firefox/ },
  ],
  webServer: {
    command: "node tests/service-worker/server.mjs",
    url: "http://127.0.0.1:5201/",
    reuseExistingServer: false,
    timeout: 360_000,
  },
});
