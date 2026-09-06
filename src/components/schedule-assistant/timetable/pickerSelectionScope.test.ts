import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { InstructorPicker } from "./InstructorPicker.tsx";
import { RoomSelect } from "./sessionSeriesRows.tsx";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const { buildOptions } = vi.hoisted(() => ({
  buildOptions: vi.fn(({ selection }: { selection?: Meeting[] }) => [
    { value: "resource", label: selection ? "bulk" : "single" },
  ]),
}));
vi.mock("./roomPickerOptions.ts", () => ({
  buildRoomPickerOptions: buildOptions,
}));
vi.mock("./instructorPickerOptions.ts", () => ({
  buildInstructorPickerOptions: buildOptions,
}));
vi.mock("@/components/common/SelectDropdown.tsx", () => ({
  SelectDropdown: ({
    options,
    triggerOption,
    onOpenChange,
  }: {
    options: { value: string; label: string }[];
    triggerOption?: { label: string };
    onOpenChange: (open: boolean) => void;
  }) =>
    createElement(
      "div",
      null,
      createElement("span", { "data-trigger": true }, triggerOption?.label),
      createElement(
        "span",
        { "data-options": true },
        options.map((option) => option.label).join(","),
      ),
      createElement("button", { onClick: () => onOpenChange(true) }, "open"),
      createElement("button", { onClick: () => onOpenChange(false) }, "close"),
    ),
}));

describe("resource picker conflict scope", () => {
  it.each(["room", "instructor"] as const)(
    "keeps %s trigger individual and only computes bulk options on open",
    async (kind) => {
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
      buildOptions.mockClear();
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const meetings: Meeting[] = [];
      const props = {
        config: {
          term: { days: [] },
          rooms: [],
          instructors: [],
        } as unknown as SchemaScheduleConfig,
        meetings,
        meetingIndex: buildMeetingPickerIndex(meetings),
        value: "resource",
        weekday: "Mon" as const,
        date: "2026-09-07",
        start: "09:00",
        end: "10:30",
        audienceTokens: [],
        onChange: vi.fn(),
      };
      const render = (pickerSelection?: Meeting[]) =>
        kind === "room"
          ? createElement(RoomSelect, { ...props, pickerSelection })
          : createElement(InstructorPicker, { ...props, pickerSelection });
      try {
        await act(async () => root.render(render()));
        buildOptions.mockClear();
        const selection = [
          { instance_id: "one" },
          { instance_id: "two" },
        ] as Meeting[];
        await act(async () => root.render(render(selection)));
        expect(buildOptions.mock.calls.every(([args]) => !args.selection)).toBe(
          true,
        );
        expect(container.querySelector("[data-trigger]")?.textContent).toBe(
          "single",
        );
        await act(async () => container.querySelectorAll("button")[0].click());
        expect(
          buildOptions.mock.calls.some(
            ([args]) => args.selection === selection,
          ),
        ).toBe(true);
        expect(
          container.querySelector("[data-options]")?.textContent,
        ).toContain("bulk");
        expect(container.querySelector("[data-trigger]")?.textContent).toBe(
          "single",
        );
        await act(async () => container.querySelectorAll("button")[1].click());
        expect(
          container.querySelector("[data-options]")?.textContent,
        ).not.toContain("bulk");
        expect(container.querySelector("[data-trigger]")?.textContent).toBe(
          "single",
        );
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
