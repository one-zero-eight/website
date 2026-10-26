import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { ToastProvider } from "@/components/toast";
import {
  COMPACT_GROUPS_SLOT_ROW_CLASS,
  GROUPS_MEETING_BODY_CLASS,
  GROUPS_MEETING_CLASS,
  GROUPS_MEETING_TITLE_CLASS,
} from "./timetableGroupsGridLayout.ts";
import { TimetableViewer } from "./TimetableWorkspace.tsx";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

const config: TimetableViewConfig = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-12-31" },
    days: [Weekday.MONDAY],
    starting_day: Weekday.MONDAY,
    time_slots: [],
    sections: [],
  },
  courses: [],
  instructors: [],
  rooms: [],
  students_groups: [],
};

describe("group timetable card layout constraints", () => {
  it("keeps intrinsic-width sticky titles inside a shrinkable grid column", () => {
    expect(GROUPS_MEETING_CLASS.split(" ")).toContain("min-w-0");
    expect(GROUPS_MEETING_BODY_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["min-w-0", "grid-cols-[minmax(0,1fr)]"]),
    );
    expect(GROUPS_MEETING_TITLE_CLASS.split(" ")).toEqual(
      expect.arrayContaining([
        "max-w-full",
        "min-w-0",
        "wrap-anywhere",
        "whitespace-normal",
        "line-clamp-3",
        "overflow-hidden",
      ]),
    );
  });

  it("preserves a shrinkable title track and footer space in compact rows", () => {
    expect(GROUPS_MEETING_BODY_CLASS.split(" ")).toEqual(
      expect.arrayContaining([
        "min-h-0",
        "flex-1",
        "grid-rows-[minmax(0,1fr)_auto]",
      ]),
    );
    expect(COMPACT_GROUPS_SLOT_ROW_CLASS).not.toContain(
      "[&_.meeting-body]:grid-rows-",
    );
    expect(COMPACT_GROUPS_SLOT_ROW_CLASS.split(" ")).toEqual(
      expect.arrayContaining([
        "[&_.meeting-body]:gap-0",
        "[&_.meeting-footer]:gap-0",
        "[&_.meeting-title]:line-clamp-1",
        "[&_.meeting-title]:max-h-[1.25em]",
        "[&_td]:h-16!",
      ]),
    );
  });
});

describe("read-only timetable capability boundary", () => {
  it.each([true, false])(
    "mounts public viewer without configuration or query providers (desktop=%s)",
    (desktop) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: desktop,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      const html = renderToStaticMarkup(
        createElement(
          ToastProvider,
          null,
          createElement(TimetableViewer, { mode: "view", config }),
        ),
      );
      for (const label of [
        "Добавить занятие",
        "Редактировать",
        "Экспорт XLSX",
        "Нераспределённые",
      ])
        expect(html).not.toContain(label);
    },
  );
});
