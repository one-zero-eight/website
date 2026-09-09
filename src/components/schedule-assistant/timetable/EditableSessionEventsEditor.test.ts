import { act, createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

import { EditableSessionEventsEditor } from "./EditableSessionEventsEditor.tsx";
import {
  SessionNotesOverrideField,
  SeriesNotesField,
} from "./SessionSeriesEditor.tsx";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import type { EditableSessionEvent } from "./editableSessionEvents.ts";
import type { Meeting } from "./timetableViewerModel.ts";

vi.mock("./sessionSeriesRows.tsx", () => ({
  FieldMark: ({ children }: { children: ReactNode }) => children,
  RoomSelect: ({ pickerSelection }: { pickerSelection?: Meeting[] }) =>
    createElement("span", { "data-room-scope": pickerSelection?.length ?? 1 }),
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
vi.mock("./DateInput.tsx", () => ({ DateInput: () => null }));
vi.mock("./SessionEventCard.tsx", () => ({
  SessionEventCard: ({ children }: { children: ReactNode }) => children,
}));

describe("notes controls", () => {
  it("inherits live series text, allows empty overrides and resets to inheritance", async () => {
    const onOverrideChange = vi.fn();
    function NotesForm() {
      const [notes, setNotes] = useState<string | null>(null);
      const [seriesNotes, setSeriesNotes] = useState("Bring a laptop");
      return createElement(
        "div",
        null,
        createElement(SeriesNotesField, {
          notes: seriesNotes,
          onChange: setSeriesNotes,
        }),
        createElement(SessionNotesOverrideField, {
          notes,
          seriesNotes,
          onChange: (value) => {
            setNotes(value);
            onOverrideChange(value);
          },
        }),
      );
    }
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    async function input(textarea: HTMLTextAreaElement, value: string) {
      await act(async () => {
        setValue.call(textarea, value);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    try {
      await act(async () => root.render(createElement(NotesForm)));
      const [series, occurrence] = container.querySelectorAll("textarea");
      expect(occurrence.value).toBe("Bring a laptop");
      expect(container.textContent).toContain("Из заметок серии");
      await input(series, "Updated series");
      expect(occurrence.value).toBe("Updated series");
      await input(occurrence, "");
      expect(onOverrideChange).toHaveBeenLastCalledWith("");
      expect(container.textContent).toContain("Заметки серии скрыты");
      await input(series, "New default");
      expect(occurrence.value).toBe("");
      await act(async () => container.querySelector("button")!.click());
      expect(onOverrideChange).toHaveBeenLastCalledWith(null);
      expect(occurrence.value).toBe("New default");
      expect(container.querySelector("button")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
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
        const textarea = container.querySelector("textarea")!;
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )!.set!.call(textarea, "Selected notes");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(
        onEventsChange.mock.lastCall?.[0].map(
          (event: EditableSessionEvent) => event.notes,
        ),
      ).toEqual(["Selected notes", "Selected notes", null]);
      await act(async () => {
        checkboxes[1]!.click();
      });
      expect(scopes("data-room-scope")).toEqual(["1", "1", "1"]);
      expect(scopes("data-instructor-scope")).toEqual(["1", "1", "1"]);
      const selectAll = [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "Снять выбор",
      );
      await act(async () => {
        selectAll!.click();
      });
      const selectAllAfterClear = [
        ...container.querySelectorAll("button"),
      ].find((button) => button.textContent === "Выбрать все");
      await act(async () => {
        selectAllAfterClear!.click();
      });
      expect(scopes("data-room-scope")).toEqual(["3", "3", "3"]);
      expect(scopes("data-instructor-scope")).toEqual(["3", "3", "3"]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});
