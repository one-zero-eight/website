import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { InstructorPicker } from "./InstructorPicker.tsx";

const mocks = vi.hoisted(() => ({
  buildOptions: vi.fn((_options: { dates: string[] }) => []),
}));
vi.mock("./instructorPickerOptions.ts", () => ({
  buildInstructorPickerOptions: mocks.buildOptions,
}));
vi.mock("@/components/common/SelectDropdown.tsx", () => ({
  SelectDropdown: () => null,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => mocks.buildOptions.mockClear());

it("checks instructors only on source dates inside the selected session window", async () => {
  const config = {
    term: {
      semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
      starting_day: Weekday.MONDAY,
      days: [Weekday.TUESDAY],
      sections: [],
    },
    students_groups: [],
  } as unknown as SchemaScheduleConfig;
  const active = { start_date: "2026-09-16", end_date: "2026-09-30" };
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        createElement(InstructorPicker, {
          config,
          meetings: [],
          meetingIndex: null,
          value: "",
          weekday: "Tue",
          weeklySlot: {
            weekday: Weekday.TUESDAY,
            start_time: "09:00:00",
            end_time: "10:30:00",
          },
          audienceTokens: [],
          active,
          start: "09:00",
          end: "10:30",
          onChange: vi.fn(),
        }),
      ),
    );
    expect(mocks.buildOptions).toHaveBeenCalled();
    const options = mocks.buildOptions.mock.lastCall![0] as { dates: string[] };
    expect(options.dates).toEqual(["2026-09-22", "2026-09-29"]);
  } finally {
    await act(async () => root.unmount());
  }
});
