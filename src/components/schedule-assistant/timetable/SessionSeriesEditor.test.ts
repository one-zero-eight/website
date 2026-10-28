import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaDateRange,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { SessionSeriesEditor } from "./SessionSeriesEditor.tsx";

const i18n = setupI18n({ locale: "en", messages: {} });

vi.mock("./sessionSeriesRows.tsx", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  WeeklySlotRow: ({
    active,
    audienceTokens,
    extraMeetings,
    slot,
  }: {
    active?: SchemaDateRange | null;
    audienceTokens: string[];
    extraMeetings: { date: string }[];
    slot: SchemaWeeklyPatternSlot;
  }) =>
    createElement("div", {
      "data-row-room": slot.room,
      "data-active": JSON.stringify(active),
      "data-audience": audienceTokens.join(","),
      "data-peer-dates": extraMeetings.map((meeting) => meeting.date).join(","),
    }),
}));
const first = { start_date: "2026-09-01", end_date: "2026-09-15" };
const second = { start_date: "2026-09-16", end_date: "2026-09-30" };
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("keeps locked sibling row picker context separate from current-window draft conflicts", async () => {
  const config = {
    term: {
      semester: { start_date: first.start_date, end_date: second.end_date },
      starting_day: Weekday.MONDAY,
      days: Object.values(Weekday),
      sections: [],
    },
    students_groups: [],
  } as unknown as SchemaScheduleConfig;
  const slot: SchemaWeeklyPatternSlot = {
    weekday: Weekday.TUESDAY,
    start_time: "09:00:00",
    end_time: "10:30:00",
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(SessionSeriesEditor, {
            config,
            meetings: [],
            meetingIndex: null,
            placement: "weekly",
            onPlacementChange: vi.fn(),
            weeklySlots: [
              { ...slot, room: "sibling" },
              { ...slot, room: "current" },
              { ...slot, room: "new" },
            ],
            onWeeklySlotsChange: vi.fn(),
            occurrences: [],
            onOccurrencesChange: vi.fn(),
            audienceTokens: ["G"],
            active: second,
            lockedRowCount: 1,
            weeklyContextForIndex: (index) =>
              index === 0
                ? { active: first, audienceTokens: ["G", "Sibling"] }
                : { active: second, audienceTokens: ["G"] },
          }),
        ),
      ),
    );
    const sibling = container.querySelector('[data-row-room="sibling"]')!;
    const current = container.querySelector('[data-row-room="current"]')!;
    expect(sibling.getAttribute("data-active")).toBe(JSON.stringify(first));
    expect(sibling.getAttribute("data-audience")).toBe("G,Sibling");
    expect(current.getAttribute("data-active")).toBe(JSON.stringify(second));
    expect(current.getAttribute("data-peer-dates")).toBe(
      "2026-09-22,2026-09-29",
    );
    expect(
      container
        .querySelector('[data-row-room="new"]')!
        .getAttribute("data-peer-dates"),
    ).toBe("2026-09-22,2026-09-29");
  } finally {
    await act(async () => root.unmount());
  }
});
