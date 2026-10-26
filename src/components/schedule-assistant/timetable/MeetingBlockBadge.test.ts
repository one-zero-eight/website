import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  MeetingBlockBadge,
  TeachingBlocksContext,
} from "./MeetingBlockBadge.tsx";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const active = { start_date: "2026-09-01", end_date: "2026-09-15" };
const config: TimetableViewConfig = {
  term: {
    name: "Fall",
    semester: { ...active, end_date: "2026-09-30" },
    blocks: [{ id: "first", name: "Первый блок", ...active }],
    days: [Weekday.MONDAY],
    starting_day: Weekday.MONDAY,
    time_slots: [],
  },
  courses: [
    {
      name: "Math",
      section_code: "core",
      components: [
        {
          tag: "lec",
          audience: ["G1"],
          sessions: [
            { audience: ["G1"], notes: "", active: { ...active } },
            { audience: ["G1"], notes: "", active: null },
            {
              audience: ["G1"],
              notes: "",
              active: { ...active, end_date: "2026-09-14" },
            },
          ],
        },
      ],
    },
  ],
};

describe("MeetingBlockBadge", () => {
  it("labels only exact block presets, not custom or whole-semester windows", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      for (const [instanceId, expected] of [
        ["0:0:0:wp:0:2026-09-01", "Первый блок"],
        ["0:0:0:occ:0", "Первый блок"],
        ["0:0:1:wp:0:2026-09-01", ""],
        ["0:0:2:wp:0:2026-09-01", ""],
        ["1:0:0:occ:0", ""],
        ["invalid", ""],
      ]) {
        await act(async () =>
          root.render(
            createElement(TeachingBlocksContext.Provider, {
              value: config,
              children: createElement(MeetingBlockBadge, { instanceId }),
            }),
          ),
        );
        expect(container.textContent).toBe(expected);
      }
      await act(async () =>
        root.render(
          createElement(MeetingBlockBadge, {
            instanceId: "0:0:0:wp:0:2026-09-01",
          }),
        ),
      );
      expect(container.textContent).toBe("");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
