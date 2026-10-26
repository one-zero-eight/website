import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaCourseConfig,
  type SchemaDateRange,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { EditClassModal } from "./EditClassModal.tsx";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import { buildMeetings } from "./timetableViewerModel.ts";

const mocks = vi.hoisted(() => ({
  courses: [] as SchemaCourseConfig[],
  mutate: vi.fn(),
  showError: vi.fn(),
}));
vi.mock("@/components/schedule-assistant/config/useConfig.tsx", () => ({
  useCoursesQuery: () => ({ data: mocks.courses }),
  useUpdateCourseMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock("@/components/toast", () => ({
  useToast: () => ({ showError: mocks.showError }),
}));
vi.mock("@/components/common/Modal.tsx", () => ({
  Modal: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./EditClassAudienceModal.tsx", () => ({
  EditClassAudienceModal: () => null,
  EditClassAudienceSummaryRow: () => null,
  EditClassPerGroupModal: () => null,
}));
vi.mock("./SessionSeriesEditor.tsx", () => ({
  SessionSeriesEditor: ({ active }: { active?: SchemaDateRange | null }) =>
    createElement("span", { "data-template-active": JSON.stringify(active) }),
  SeriesNotesField: () => null,
  SessionPlacementToggle: ({
    onChange,
  }: {
    onChange: (placement: "weekly" | "dates_pattern") => void;
  }) =>
    createElement(
      "div",
      null,
      createElement(
        "button",
        { type: "button", onClick: () => onChange("dates_pattern") },
        "To dates",
      ),
      createElement(
        "button",
        { type: "button", onClick: () => onChange("weekly") },
        "To weekly",
      ),
    ),
}));
vi.mock("./EditableSessionEventsEditor.tsx", () => ({
  EditableSessionEventsEditor: ({
    events,
    afterHeader,
  }: {
    events: { date: string }[];
    afterHeader: ReactNode;
  }) =>
    createElement(
      "div",
      { "data-event-dates": events.map((event) => event.date).join(",") },
      afterHeader,
    ),
}));

const first = { start_date: "2026-09-01", end_date: "2026-09-15" };
const second = { start_date: "2026-09-16", end_date: "2026-09-30" };
function configFor(): SchemaScheduleConfig {
  return {
    term: {
      semester: { start_date: first.start_date, end_date: second.end_date },
      starting_day: Weekday.MONDAY,
      days: Object.values(Weekday),
      sections: [],
      time_slots: [],
      blocks: [
        { id: "first", name: "First", ...first },
        { id: "second", name: "Second", ...second },
      ],
    },
    students_groups: [{ code: "G" }],
    courses: [
      {
        name: "Math",
        section_code: "core",
        components: [
          {
            tag: "lec",
            audience: ["G"],
            per_group: false,
            instructor_pool: [],
            sessions: [first, second].map((active) => ({
              audience: ["G"],
              notes: "Keep",
              active,
              weekly_pattern: [
                {
                  weekday: Weekday.TUESDAY,
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                  instructor: ["T1", "T2"],
                  edits: [
                    { select_week: "2026-10-05", notes: "inactive edit" },
                  ],
                },
              ],
              dates_pattern: null,
            })),
          },
        ],
      },
    ],
  } as unknown as SchemaScheduleConfig;
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.showError.mockReset();
});
async function mount(config: SchemaScheduleConfig) {
  mocks.courses = config.courses!;
  const meetings = buildMeetings(config);
  const meeting = meetings.find(
    (meeting) => meeting.instance_id === "0:0:1:wp:0:2026-09-22",
  )!;
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(EditClassModal, {
        open: true,
        onOpenChange: vi.fn(),
        meeting,
        config,
        meetings,
        meetingPickerIndex: buildMeetingPickerIndex(meetings),
      }),
    ),
  );
  return {
    container,
    select: async (value: string) =>
      act(async () => {
        const select = container.querySelector("select")!;
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    click: async (label: string) =>
      act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === label)!
          .click(),
      ),
    cleanup: async () => act(async () => root.unmount()),
  };
}

describe("EditClassModal session windows", () => {
  it("saves a range-only edit to the exact selected series without rewriting co-teachers or inactive edits", async () => {
    const config = configFor();
    const source = structuredClone(config.courses![0]);
    const editor = await mount(config);
    try {
      expect(
        editor.container
          .querySelector("[data-event-dates]")
          ?.getAttribute("data-event-dates"),
      ).toBe("2026-09-22,2026-09-29");
      await editor.select("block:0");
      expect(
        editor.container
          .querySelector("[data-template-active]")
          ?.getAttribute("data-template-active"),
      ).toBe(JSON.stringify(first));
      expect(
        editor.container
          .querySelector("[data-event-dates]")
          ?.getAttribute("data-event-dates"),
      ).toBe("2026-09-01,2026-09-08,2026-09-15");
      await editor.click("Сохранить");
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.mutate).toHaveBeenCalledOnce();
      const updated = mocks.mutate.mock.lastCall![0].body as SchemaCourseConfig;
      expect(updated.components[0].sessions![0]).toEqual(
        source.components[0].sessions![0],
      );
      expect(updated.components[0].sessions![1]).toEqual({
        ...source.components[0].sessions![1],
        active: first,
      });
      expect(config.courses![0]).toEqual(source);
    } finally {
      await editor.cleanup();
    }
  });

  it("keeps weekly-to-dates and reverse conversions within the selected series window", async () => {
    const config = configFor();
    const editor = await mount(config);
    try {
      await editor.click("To dates");
      expect(
        editor.container
          .querySelector("[data-event-dates]")
          ?.getAttribute("data-event-dates"),
      ).toBe("2026-09-22,2026-09-29");
      await editor.click("To weekly");
      expect(
        editor.container
          .querySelector("[data-event-dates]")
          ?.getAttribute("data-event-dates"),
      ).toBe("2026-09-22,2026-09-29");
      await editor.click("To dates");
      await editor.click("Сохранить");
      const updated = mocks.mutate.mock.lastCall![0].body as SchemaCourseConfig;
      expect(updated.components[0].sessions![1].active).toEqual(second);
      expect(updated.components[0].sessions![1].weekly_pattern).toEqual([]);
      expect(
        updated.components[0].sessions![1].dates_pattern?.map(
          (occurrence) => occurrence.date,
        ),
      ).toEqual(["2026-09-22", "2026-09-29"]);
      expect(updated.components[0].sessions![0]).toEqual(
        config.courses![0].components[0].sessions![0],
      );
    } finally {
      await editor.cleanup();
    }
  });
});
