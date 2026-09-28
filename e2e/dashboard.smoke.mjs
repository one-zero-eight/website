// Run after `pnpm run build`: node e2e/dashboard.smoke.mjs
// Serves the production bundle through Playwright routing, without starting a
// server or sending requests to real services. All account/API data is synthetic.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { loadEnv } from "vite";

const root = process.cwd();
const env = loadEnv("production", root, "VITE_");
const now = new Date("2026-06-15T09:00:00Z");
const user = {
  id: 123,
  innopolis_info: {
    name: "Dashboard Test Student",
    email: "student@example.test",
    is_student: true,
  },
  telegram_info: { username: "test_student" },
};
const token = `test.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.test`;
const emptyIcs = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
const iso = (minutes) =>
  new Date(now.getTime() + minutes * 60_000).toISOString();
const icsDate = (minutes) =>
  iso(minutes).replaceAll(/[-:]/g, "").replace(".000", "");
const calendarIcs = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  ...Array.from({ length: 7 }, (_, index) => [
    "BEGIN:VEVENT",
    `UID:class-${index}`,
    `SUMMARY:${index === 0 ? "Distributed systems seminar" : `Daily calendar activity ${index}`}`,
    "LOCATION:University room 108",
    `DTSTART:${icsDate(index * 60 - 15)}`,
    `DTEND:${icsDate(index * 60 + 45)}`,
    "END:VEVENT",
  ]).flat(),
  "END:VCALENDAR",
].join("\r\n");
const trainings = Array.from({ length: 5 }, (_, index) => ({
  title: index === 0 ? "Not checked in" : `Sport session ${index}`,
  start: iso(index * 60 - 17),
  end: iso(index * 60 + 43),
  allDay: false,
  extendedProps: {
    id: index,
    checked_in: index !== 0,
    training_class: "Sports complex · Training hall",
  },
}));
const contentTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
});
try {
  for (const width of [360, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 1100 },
        serviceWorkers: "block",
        timezoneId: "Europe/Moscow",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.install({ time: now });
      await page.addInitScript(
        ({ token, user, theme }) => {
          localStorage.setItem("accessToken", JSON.stringify(token));
          localStorage.setItem("accessTokenSport", JSON.stringify(token));
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("theme", JSON.stringify(theme));
        },
        { token, user, theme },
      );
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        const matchingApi = Object.entries(env).find(
          ([key, value]) =>
            key.endsWith("API_URL") &&
            url.href.startsWith(value.replace(/\/$/, "") + "/"),
        );
        if (matchingApi) {
          const [service, base] = matchingApi;
          const endpoint = url.pathname.slice(
            new URL(base).pathname.replace(/\/$/, "").length,
          );
          let data = [];
          if (service.includes("ACCOUNTS"))
            data = endpoint === "/users/me" ? user : {};
          if (service.includes("INNOSPORT")) {
            if (endpoint === "/profile/student") data = { id: 123 };
            else if (endpoint.endsWith("/hours"))
              data = {
                ongoing_semester: {
                  id_sem: 1,
                  hours_not_self: 14,
                  hours_self_not_debt: 2,
                  hours_self_debt: 0,
                  hours_sem_max: 30,
                  debt: 0,
                },
              };
            else if (endpoint === "/semester")
              data = [{ id: 1, end: "2026-08-31" }];
            else if (endpoint === "/calendar/trainings") data = trainings;
          }
          if (service === "VITE_SCHEDULE_API_URL") {
            if (endpoint === "/users/me")
              data = {
                id: 123,
                favorite_event_groups: [1],
                hidden_event_groups: [],
                sports_hidden: false,
                music_room_hidden: true,
                moodle_hidden: true,
                linked_calendars: {},
              };
            else if (endpoint === "/event-groups/")
              data = {
                event_groups: [
                  {
                    id: 1,
                    name: "B25",
                    alias: "test",
                    tags: [],
                    created_at: now.toISOString(),
                    updated_at: now.toISOString(),
                  },
                ],
              };
            else if (endpoint === "/users/me/predefined")
              data = { event_groups: [1] };
            else if (endpoint.endsWith(".ics"))
              return route.fulfill({
                contentType: "text/calendar",
                body: endpoint === "/test.ics" ? calendarIcs : emptyIcs,
              });
          }
          return route.fulfill({ json: data });
        }
        if (url.origin === "http://dashboard.test") {
          const relative =
            url.pathname === "/" ? "index.html" : url.pathname.slice(1);
          const file = path.resolve(root, "dist", relative);
          if (file.startsWith(path.resolve(root, "dist") + path.sep)) {
            try {
              return await route.fulfill({
                contentType:
                  contentTypes[path.extname(file)] ||
                  "application/octet-stream",
                body: await readFile(file),
              });
            } catch {
              /* Treat unknown local paths as missing assets. */
            }
          }
        }
        return route.fulfill({ status: 404, body: "Mock: no route" });
      });
      await page.goto("http://dashboard.test/");
      const calendar = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Calendar", exact: true }),
      });
      const sports = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Sports", exact: true }),
      });
      await calendar.getByText("Distributed systems seminar").waitFor();
      assert.equal(await calendar.locator("li").count(), 5);
      assert.equal(
        await calendar.getByText("In process", { exact: true }).count(),
        1,
      );
      await sports.getByText("Sport session 1").waitFor();
      assert.equal(await sports.locator("li").count(), 3);
      assert.equal(await sports.getByText("Not checked in").count(), 0);
      assert.equal(
        await sports.getByText("Starts in 43 min", { exact: true }).count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "Go to calendar", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await sports
          .getByRole("link", { name: "Go to official site" })
          .getAttribute("href"),
        "https://sport.innopolis.university/profile/",
      );
      await page.evaluate(
        (theme) => document.documentElement.setAttribute("data-theme", theme),
        theme,
      );
      const calendarBox = await calendar.boundingBox();
      const sportBox = await sports.boundingBox();
      assert.ok(calendarBox.y <= sportBox.y);
      if (width === 1440) assert.ok(calendarBox.x < sportBox.x);
      if (width === 360) assert.ok(calendarBox.y < sportBox.y);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Horizontal overflow at ${width}`,
      );
      assert.deepEqual(errors, []);
      if (process.env.DASHBOARD_SCREENSHOT_DIR)
        await page.screenshot({
          path: path.join(
            process.env.DASHBOARD_SCREENSHOT_DIR,
            `dashboard-${width}-${theme}.png`,
          ),
          fullPage: true,
        });
      await page.clock.fastForward(43 * 60_000);
      await sports.getByText("In process", { exact: true }).waitFor();
      await page.clock.fastForward(60 * 60_000);
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll("section li")].some((row) =>
            row.textContent.includes("Sport session 1"),
          ),
      );
      assert.equal(await sports.locator("li").count(), 3);
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}px ${theme}: limits, live transitions, order, links, no overflow or browser exceptions`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
