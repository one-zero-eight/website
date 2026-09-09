import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { ToastProvider } from "@/components/toast";
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
