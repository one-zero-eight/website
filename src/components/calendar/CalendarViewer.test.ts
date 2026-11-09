import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CalendarViewer } from "./CalendarViewer";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import { CalendarEventTime } from "./CalendarEventTime";

vi.mock("@/components/dashboard/academic-calendar.tsx", () => ({
  useMyAcademicCalendar: () => ({ academicCalendar: undefined }),
}));
vi.mock("./ConfigCalendarDialog.tsx", () => ({
  ConfigCalendarDialog: () => null,
}));
vi.mock("@/api/events", () => ({ $events: { useQuery: () => ({}) } }));
vi.mock("@/api/helpers/access-token.ts", () => ({
  getMyAccessToken: () => null,
}));
vi.mock("@/api/search/links.ts", () => ({
  SEARCH_API_URL: "https://api.innohassle.ru/search",
  getMyAssistantCalendarLink: () =>
    "https://api.innohassle.ru/search/users/my-calendar.ics",
}));

const url = "https://api.innohassle.ru/search/users/my-calendar.ics";
function ics(...events: string[][]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...events.flatMap((lines) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"]),
    "END:VCALENDAR",
  ].join("\r\n");
}
const unknown = ["UID:unknown", "SUMMARY:Old event", "DTSTART:20260703T090000"];
const known = [
  "UID:known",
  "SUMMARY:Known event",
  "DTSTART:20260703T120000",
  "DTEND:20260703T133000",
];
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubEnv("TZ", "Europe/Moscow");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-03T06:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addListener() {}, removeListener() {} })),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
async function renderCalendar(
  feed: string,
  initialView = "listMonth",
  locale = "en",
  feedUrl = url,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(feed)),
  );
  const i18n = setupI18n({
    locale,
    messages: { en: enMessages, ru: ruMessages },
  });
  const received = vi.fn();
  await act(async () => {
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(CalendarViewer, {
          urls: [feedUrl],
          initialView,
          onEventSourceSuccess: (events, response) => {
            received(structuredClone(events), response);
          },
        }),
      ),
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return received;
}

it("retains source uncertainty even when FullCalendar synthesizes a layout end", async () => {
  const received = await renderCalendar(ics(unknown));
  const calendar = new Calendar(document.createElement("div"), {
    plugins: [dayGridPlugin],
    forceEventDuration: true,
  });
  const event = calendar.addEvent(received.mock.calls[0][0][0])!;
  expect(event.end).not.toBeNull();
  const i18n = setupI18n({ locale: "en", messages: { en: enMessages } });
  await act(async () =>
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(CalendarEventTime, {
          event,
          timeText: event.formatRange({
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        }),
      ),
    ),
  );
  expect(container.textContent).toBe("09:00 · end time not specified");
  calendar.destroy();
});

it("preserves explicit durations and recurring missing-end semantics", async () => {
  const received = await renderCalendar(
    ics(
      [...unknown, "RRULE:FREQ=DAILY;COUNT=2"],
      [
        "UID:duration",
        "SUMMARY:Duration event",
        "DTSTART:20260703T140000",
        "DURATION:PT45M",
      ],
      ["UID:date-only", "SUMMARY:Date only", "DTSTART;VALUE=DATE:20260703"],
    ),
  );
  const events = received.mock.calls[0][0];
  expect(
    events.filter((event: { id: string }) => event.id === "unknown"),
  ).toEqual([
    expect.objectContaining({
      start: "2026-07-03T09:00:00",
      end: null,
      extendedProps: expect.objectContaining({ endUnknown: true }),
    }),
    expect.objectContaining({
      start: "2026-07-04T09:00:00",
      end: null,
      extendedProps: expect.objectContaining({ endUnknown: true }),
    }),
  ]);
  expect(
    events.find((event: { id: string }) => event.id === "duration"),
  ).toMatchObject({
    start: "2026-07-03T14:00:00",
    end: "2026-07-03T14:45:00",
    extendedProps: { endUnknown: false },
  });
  const dateOnly = [...container.querySelectorAll(".fc-event")].find((el) =>
    el.textContent?.includes("Date only"),
  );
  expect(dateOnly!.textContent).toContain("All day");
  expect(dateOnly!.textContent).not.toContain("end time not specified");
});

it.each(["en", "ru"])(
  "offers an assistant draft to clarify an old AI event in %s",
  async (locale) => {
    await renderCalendar(ics(unknown), "listMonth", locale);
    const row = container.querySelector<HTMLElement>(".fc-list-event")!;
    await act(async () => row.click());
    const link = document.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href^="/search/ask?"]',
    );
    expect(link).not.toBeNull();
    expect(link!.textContent).toBe(
      locale === "ru"
        ? "Уточнить окончание с ассистентом"
        : "Clarify end time with the assistant",
    );
    const query = new URL(link!.href).searchParams.get("q")!;
    expect(query).toContain("Old event");
    expect(query).toContain("2026-07-03");
    expect(query).toContain("09:00");
    expect(query).not.toMatch(/10:30|90/);
  },
);

it("does not offer local-calendar editing for public calendar events", async () => {
  await renderCalendar(
    ics(unknown),
    "listMonth",
    "en",
    "https://api.innohassle.ru/schedule/public.ics",
  );
  await act(async () =>
    container.querySelector<HTMLElement>(".fc-list-event")!.click(),
  );
  expect(
    document.querySelector('[role="dialog"] a[href^="/search/ask?"]'),
  ).toBeNull();
});

it("localizes unknown-end and all-day labels in Russian", async () => {
  await renderCalendar(
    ics(unknown, [
      "UID:all-day",
      "SUMMARY:Whole day",
      "DTSTART;VALUE=DATE:20260703",
      "DTEND;VALUE=DATE:20260704",
    ]),
    "listMonth",
    "ru",
  );
  expect(container.textContent).toContain("окончание не указано");
  const row = [
    ...container.querySelectorAll<HTMLElement>(".fc-list-event"),
  ].find((el) => el.textContent?.includes("Whole day"));
  expect(row!.textContent).toContain("Весь день");
  await act(async () => row!.click());
  expect(document.querySelector('[role="dialog"]')!.textContent).toContain(
    "Весь день",
  );
});

it.each(["listMonth", "timeGridWeek", "dayGridMonth"])(
  "keeps actual all-day ICS dates visible in %s",
  async (view) => {
    await renderCalendar(
      ics([
        "UID:all-day",
        "SUMMARY:Whole day",
        "DTSTART;VALUE=DATE:20260703",
        "DTEND;VALUE=DATE:20260704",
      ]),
      view,
    );
    const events = [
      ...container.querySelectorAll<HTMLElement>(".fc-event"),
    ].filter((el) => el.textContent?.includes("Whole day"));
    expect(events).toHaveLength(1);
    expect(events[0].textContent).not.toMatch(
      /00:00|Invalid date|end time not specified/,
    );
    if (view === "timeGridWeek") {
      expect(events[0].closest(".fc-daygrid-body")).not.toBeNull();
      expect(
        [...container.querySelectorAll(".fc-timegrid-axis")]
          .map((el) => el.textContent)
          .join(" "),
      ).toContain("All day");
    }
    await act(async () => events[0].click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.textContent).toContain("3 July");
    expect(dialog!.textContent).toContain("All day");
    expect(dialog!.textContent).not.toMatch(
      /00:00|Invalid date|end time not specified/,
    );
  },
);

it.each(["timeGridWeek", "timeGrid3", "dayGridMonth"])(
  "shows unknown end in %s rather than a default finish",
  async (view) => {
    await renderCalendar(ics(unknown), view);
    const event = [...container.querySelectorAll(".fc-event")].find((el) =>
      el.textContent?.includes("Old event"),
    );
    expect(event).toBeDefined();
    expect(event!.textContent).toContain("09:00");
    expect(event!.textContent).toContain("end time not specified");
    expect(event!.textContent).not.toMatch(/10:00|10:30/);
  },
);

it("opens the missing-end event popover without an invented or invalid finish", async () => {
  await renderCalendar(ics(unknown));
  const row = [
    ...container.querySelectorAll<HTMLElement>(".fc-list-event"),
  ].find((el) => el.textContent?.includes("Old event"));
  await act(async () => row!.click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(dialog!.textContent).toContain("09:00");
  expect(dialog!.textContent).toContain("end time not specified");
  expect(dialog!.textContent).not.toMatch(/Invalid date|10:00|10:30/);
});

it("renders the real ICS missing-end event honestly in the list", async () => {
  const received = await renderCalendar(ics(unknown, known));
  const row = [...container.querySelectorAll(".fc-list-event")].find((el) =>
    el.textContent?.includes("Old event"),
  );
  expect(row).toBeDefined();
  expect(row!.textContent).toContain("end time not specified");
  expect(row!.textContent).toContain("09:00");
  expect(row!.textContent).not.toMatch(/10:00|10:30|Invalid date/);
  expect(
    received.mock.calls[0][0].find(
      (event: { id: string }) => event.id === "unknown",
    ),
  ).toMatchObject({
    end: null,
    extendedProps: { endUnknown: true },
  });
  const knownRow = [...container.querySelectorAll(".fc-list-event")].find(
    (el) => el.textContent?.includes("Known event"),
  );
  expect(knownRow!.textContent).toContain("13:30");
  expect(knownRow!.textContent).not.toContain("end time not specified");
});
