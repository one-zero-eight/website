import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaCourseConfig,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { CreateClassModal } from "./CreateClassModal.tsx";
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
vi.mock("@/components/common/SelectDropdown.tsx", () => ({
  SelectDropdown: () => null,
}));
vi.mock("./EditClassAudienceModal.tsx", () => ({
  EditClassAudienceModal: () => null,
  EditClassAudienceSummaryRow: () => null,
  EditClassPerGroupModal: () => null,
}));
vi.mock("./SessionSeriesEditor.tsx", () => ({
  SessionSeriesEditor: ({
    active,
    weeklySlots,
    lockedRowCount,
  }: {
    active: unknown;
    weeklySlots: unknown[];
    lockedRowCount: number;
  }) =>
    createElement("div", {
      "data-active": JSON.stringify(active),
      "data-row-count": weeklySlots.length,
      "data-locked-count": lockedRowCount,
    }),
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
    rooms: [],
    instructors: [],
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
            sessions: [first, second].map((active, index) => ({
              audience: ["G"],
              notes: `Block ${index + 1}`,
              active,
              weekly_pattern: [
                {
                  weekday: Weekday.TUESDAY,
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                  room: `block-${index + 1}`,
                },
              ],
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

it("creates inside the default block without leaking same-audience sibling rows", async () => {
  const config = configFor();
  mocks.courses = config.courses!;
  const original = structuredClone(mocks.courses[0]);
  const meetings = buildMeetings(config);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        createElement(CreateClassModal, {
          open: true,
          onOpenChange: vi.fn(),
          config,
          meetings,
          meetingPickerIndex: buildMeetingPickerIndex(meetings),
          layoutMode: "groups",
          cellContext: {
            weekday: "Tue",
            time: "11:00",
            date: "2026-09-22",
            groupId: "G",
          },
          preset: { courseIdx: 0, componentIdx: 0, audience: ["G"] },
          defaultActive: second,
        }),
      ),
    );
    const editor = container.querySelector("[data-active]")!;
    expect(editor.getAttribute("data-active")).toBe(JSON.stringify(second));
    expect(editor.getAttribute("data-row-count")).toBe("3");
    expect(editor.getAttribute("data-locked-count")).toBe("1");
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Добавить")!
        .click(),
    );
    expect(mocks.showError).not.toHaveBeenCalled();
    expect(mocks.mutate).toHaveBeenCalledOnce();
    const updated = mocks.mutate.mock.lastCall![0].body as SchemaCourseConfig;
    expect(updated.components[0].sessions).toHaveLength(2);
    expect(updated.components[0].sessions![0]).toEqual(
      original.components[0].sessions![0],
    );
    expect(updated.components[0].sessions![1]).toMatchObject({
      active: second,
      notes: "Block 2",
    });
    expect(updated.components[0].sessions![1].weekly_pattern).toHaveLength(2);
    expect(
      updated.components[0].sessions![1].weekly_pattern?.map(
        (slot) => slot.room,
      ),
    ).not.toContain("block-1");
    expect(mocks.courses[0]).toEqual(original);

    await act(async () => {
      const select = container.querySelector("select")!;
      select.value = "block:0";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Добавить")!
        .click(),
    );
    const switched = mocks.mutate.mock.lastCall![0].body as SchemaCourseConfig;
    expect(switched.components[0].sessions![0].active).toEqual(first);
    expect(switched.components[0].sessions![0].weekly_pattern).toHaveLength(2);
    expect(switched.components[0].sessions![1]).toEqual(
      original.components[0].sessions![1],
    );
  } finally {
    await act(async () => root.unmount());
  }
});
