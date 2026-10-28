import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

import { EditableSessionEventsEditor } from "./EditableSessionEventsEditor.tsx";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import type { EditableSessionEvent } from "./editableSessionEvents.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const i18n = setupI18n({ locale: "en", messages: {} });

vi.mock("./sessionSeriesRows.tsx", () => ({
  FieldMark: ({ children }: { children: ReactNode }) => children,
  RoomSelect: ({
    pickerSelection,
    onChange,
  }: {
    pickerSelection?: Meeting[];
    onChange: (room: string) => void;
  }) =>
    createElement("button", {
      type: "button",
      "data-room-scope": pickerSelection?.length ?? 1,
      onClick: () => onChange("999"),
    }),
  SlotTimeFields: () => null,
  toUiTime: (value: string) => value.slice(0, 5),
  weekdayToKey: () => "Fri",
}));
vi.mock("./InstructorPicker.tsx", () => ({
  InstructorPicker: ({ pickerSelection }: { pickerSelection?: Meeting[] }) =>
    createElement("span", {
      "data-instructor-scope": pickerSelection?.length ?? 1,
    }),
}));
vi.mock("@/components/schedule-assistant/DateInput.tsx", () => ({
  DateInput: () => null,
}));
vi.mock("./SessionEventCard.tsx", () => ({
  SessionEventCard: ({ children }: { children: ReactNode }) => children,
}));

describe("window-aware new occurrences", () => {
  it("seeds the first explicit date from the effective selected window", async () => {
    const active = { start_date: "2026-09-16", end_date: "2026-09-30" };
    const onEventsChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    try {
      await act(async () =>
        root.render(
          createElement(
            I18nProvider,
            { i18n },
            createElement(EditableSessionEventsEditor, {
              config: {
                term: {
                  semester: {
                    start_date: "2026-09-01",
                    end_date: "2026-09-30",
                  },
                  sections: [],
                },
                students_groups: [],
              } as unknown as SchemaScheduleConfig,
              meetings: [],
              meetingIndex: null,
              events: [],
              originalEvents: [],
              audienceTokens: [],
              onEventsChange,
              meetingRef: null,
              focusKey: null,
              allowAddOccurrence: true,
              active,
            }),
          ),
        ),
      );
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Add date"))!
          .click(),
      );
      expect(onEventsChange.mock.lastCall![0][0].date).toBe(active.start_date);
    } finally {
      await act(async () => root.unmount());
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});

describe("bulk resource picker selection", () => {
  it("updates both selected row pickers and leaves unselected rows independent", async () => {
    const events: EditableSessionEvent[] = [
      "2026-09-04",
      "2026-09-11",
      "2026-09-18",
    ].map((date, index) => ({
      key: `occ:${index}`,
      source: { kind: "occurrence", draftId: `orig-${index}`, occIdx: index },
      date,
      start_time: "16:00:00",
      end_time: "17:30:00",
      room: "304",
      instructor: "teacher",
      notes: null,
      cancelled: false,
    }));
    const onEventsChange = vi.fn();
    const meetings: Meeting[] = events.map((event, index) => ({
      instance_id: `0:0:0:occ:${index}`,
      date: event.date,
      start: "16:00",
      end: "17:30",
      room: "304",
      instructors: ["teacher"],
      course: "ML",
      tag: "lab",
      groups: [],
      instructor_pool: [],
      section: "core",
    }));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    try {
      await act(async () =>
        root.render(
          createElement(
            I18nProvider,
            { i18n },
            createElement(EditableSessionEventsEditor, {
              config: {
                term: { days: ["friday"] },
              } as unknown as SchemaScheduleConfig,
              meetings,
              meetingIndex: buildMeetingPickerIndex(meetings),
              events,
              originalEvents: events,
              onEventsChange,
              audienceTokens: [],
              meetingRef: {
                kind: "occ",
                courseIdx: 0,
                componentIdx: 0,
                seriesIdx: 0,
                occIdx: 0,
              },
              focusKey: null,
            }),
          ),
        ),
      );
      const scopes = (attribute: string) =>
        [...container.querySelectorAll(`[${attribute}]`)].map((element) =>
          element.getAttribute(attribute),
        );
      expect(scopes("data-room-scope")).toEqual(["1", "1", "1"]);
      const checkboxes = container.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      );
      await act(async () => {
        checkboxes[0]!.click();
        checkboxes[1]!.click();
      });
      expect(scopes("data-room-scope")).toEqual(["2", "2", "1"]);
      expect(scopes("data-instructor-scope")).toEqual(["2", "2", "1"]);
      await act(async () => {
        container
          .querySelectorAll<HTMLButtonElement>("[data-room-scope]")[0]!
          .click();
      });
      expect(
        onEventsChange.mock.lastCall?.[0].map(
          (event: EditableSessionEvent) => event.room,
        ),
      ).toEqual(["999", "999", "304"]);
      await act(async () => {
        checkboxes[1]!.click();
      });
      expect(scopes("data-room-scope")).toEqual(["1", "1", "1"]);
      expect(scopes("data-instructor-scope")).toEqual(["1", "1", "1"]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});
