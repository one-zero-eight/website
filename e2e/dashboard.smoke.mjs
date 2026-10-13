// Run after `pnpm run build`: node e2e/dashboard.smoke.mjs
// Serves the production bundle through Playwright routing, without starting a
// server or sending requests to real services. All account/API data is synthetic.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { loadEnv } from "vite";

const root = process.cwd();
const screenshotDir = path.resolve(
  root,
  process.env.DASHBOARD_SCREENSHOT_DIR || "screenshots",
);
await mkdir(screenshotDir, { recursive: true });
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
const trainings = [
  ...Array.from({ length: 2 }, (_, index) => ({
    title: index === 0 ? "Not checked in" : `Sport session ${index}`,
    start: iso(index * 60 - 17),
    end: iso(index * 60 + 43),
    allDay: false,
    extendedProps: {
      id: index,
      checked_in: index !== 0,
      training_class: "Sports complex · Training hall",
    },
  })),
  {
    title: "Sport session 2",
    start: iso(24 * 60 + 120),
    end: iso(24 * 60 + 180),
    allDay: false,
    extendedProps: {
      id: 2,
      checked_in: true,
      training_class: "Sports complex · Training hall",
    },
  },
];
const rooms = Array.from({ length: 8 }, (_, index) => ({
  id: String(101 + index),
  title: `Room ${101 + index}`,
  short_name: String(101 + index),
  access_level: "yellow",
  restrict_daytime: index === 7,
}));
const roomBooking = (
  roomId,
  startMinutes,
  endMinutes,
  title = "Room reservation",
) => ({
  id: `${roomId}:${startMinutes}`,
  room_id: roomId,
  title,
  start: iso(startMinutes),
  end: iso(endMinutes),
  attendees: null,
  outlook_booking_id: null,
  outlook_entry_id: null,
});
const ownBookings = [
  roomBooking("105", 120, 180),
  roomBooking("101", 11 * 60 + 40, 13 * 60 + 40, "Project meeting"),
];
const allBookings = [
  ...ownBookings,
  roomBooking("102", -10, 60),
  roomBooking("103", 240, 300),
  roomBooking("104", 480, 540),
  roomBooking("107", 720, 780),
];
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
          if (service === "VITE_BOOKING_API_URL") {
            if (endpoint === "/rooms/") data = rooms;
            else if (endpoint === "/rooms/my-access-list") data = [];
            else if (endpoint === "/bookings/my") data = ownBookings;
            else if (endpoint === "/bookings/") data = allBookings;
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
          const relative = route.request().isNavigationRequest()
            ? "index.html"
            : url.pathname.slice(1);
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
      page.setDefaultTimeout(15_000);
      await page.getByText("Project meeting", { exact: true }).waitFor();
      await page
        .getByText("Distributed systems seminar", { exact: true })
        .waitFor();
      await page.getByText("Sport session 1", { exact: true }).waitFor();
      await page.getByText("Music Room Bookings", { exact: true }).waitFor();
      await page.getByText("[B25] Semester F26:", { exact: false }).waitFor();
      await page.evaluate(
        (theme) => document.documentElement.setAttribute("data-theme", theme),
        theme,
      );
      await page.evaluate(() => document.fonts.ready);
      if (errors.length > 0) {
        throw new Error(`Browser errors: ${errors.join("; ")}`);
      }
      const screenshotPath = path.join(
        screenshotDir,
        `dashboard-${width}-${theme}.png`,
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });
      console.log(`Saved ${screenshotPath}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
