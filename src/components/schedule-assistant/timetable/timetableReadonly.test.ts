import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { buildCalendarGrid } from "./timetableCalendarModel.ts";
import { TimetableCalendarTable } from "./TimetableCalendarTable.tsx";
import {
  createSelectionStore,
  SelectionStoreContext,
} from "./timetableSelectionStore.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const config: TimetableViewConfig = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-12-31" },
    days: [Weekday.MONDAY],
    starting_day: Weekday.MONDAY,
    time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
  },
};
const meeting: Meeting = {
  instance_id: "0:0:0:occ:0",
  course: "Math",
  tag: "lec",
  groups: ["A"],
  date: "2026-09-07",
  start: "09:00",
  end: "10:30",
  room: "101",
  instructors: "teacher",
  section: "core",
  notes: "<script>not executable</script>",
};
const calendarGrid = buildCalendarGrid(
  config,
  [meeting],
  [{ key: "2026-09-07", start: "2026-09-07", end: "2026-09-13" }],
  "core",
)!;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  document.body.innerHTML = "";
});

async function mount(editable: boolean) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const selectMeeting = vi.fn();
  const edit = vi.fn();
  const create = vi.fn();
  const store = createSelectionStore();
  store.setPersonalGroups(["A"]);
  await act(async () => {
    root.render(
      createElement(
        SelectionStoreContext.Provider,
        { value: store },
        createElement(TimetableCalendarTable, {
          calendarGrid,
          courseColors: {},
          selectMeeting,
          clearSelection: vi.fn(),
          openMeetingEdit: editable ? edit : undefined,
          onEmptyCellClick: editable ? create : undefined,
        }),
      ),
    );
  });
  return { container, selectMeeting, edit, create };
}

describe("read-only calendar capability boundary", () => {
  it("keeps selection and own-group marks but has no create or edit interaction", async () => {
    const { container, selectMeeting, edit, create } = await mount(false);
    const card =
      container.querySelector<HTMLButtonElement>("[data-meeting-id]")!;
    await act(async () => {
      card.click();
      card.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });
    expect(selectMeeting).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(
      [...container.querySelectorAll("button")].some(
        (button) => button.textContent?.trim() === "+",
      ),
    ).toBe(false);
    expect(card.className).toContain("border-l-emerald-600");
    expect(card.textContent).toContain(meeting.notes);
    expect(container.querySelector("script")).toBeNull();
  });
  it("preserves moderator add and double-click edit actions", async () => {
    const { container, create, edit } = await mount(true);
    const add = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "+",
    )!;
    await act(async () => add.click());
    expect(create).toHaveBeenCalledOnce();
    await act(async () =>
      container
        .querySelector("[data-meeting-id]")!
        .dispatchEvent(new MouseEvent("dblclick", { bubbles: true })),
    );
    expect(edit).toHaveBeenCalledWith(meeting);
  });
});
