import { describe, expect, it } from "vitest";
import {
  getSlotAvailabilityRatio,
  getSlotHeatmapAppearance,
  getSlotHeatmapAppearanceColorblindSafe,
  getSlotKeysBetween,
} from "./slots.ts";
import {
  getBestIntersection,
  getIntersectionAtMinParticipants,
} from "./best-slot.ts";
import {
  countExplicitSlotAvailability,
  getParticipantsWithExplicitSlot,
  userHasExplicitAvailability,
} from "./participants.ts";

describe("getSlotAvailabilityRatio", () => {
  it.each([
    [0, 10, 0],
    [4, 8, 0.5],
    [10, 10, 1],
    [12, 10, 1],
  ])("returns ratio %s/%s clamped to %s", (count, maxCount, expectedRatio) => {
    expect(getSlotAvailabilityRatio(count, maxCount)).toBe(expectedRatio);
  });
});

describe("getSlotHeatmapAppearance", () => {
  it("keeps the base background without an inline style for empty slots", () => {
    const emptyAppearance = getSlotHeatmapAppearance(0, 10);

    expect(emptyAppearance.className).toBe("bg-base-100 hover:bg-primary/10");
    expect(emptyAppearance.style).toBeUndefined();
  });

  it.each([
    [1, 1, 75],
    [1, 2, 38],
    [1, 3, 25],
    [1, 10, 8],
    [3, 10, 23],
    [5, 10, 38],
    [7, 10, 53],
    [10, 10, 75],
    [3, 7, 32],
    [50, 100, 38],
    [99, 100, 74],
  ])("mixes %s/%s availability at %s%% opacity", (count, maxCount, percent) => {
    const appearance = getSlotHeatmapAppearance(count, maxCount);

    expect(appearance.style?.backgroundColor).toBe(
      `color-mix(in oklch, var(--color-primary) ${percent}%, transparent)`,
    );
  });

  it("uses primary content text color for full availability", () => {
    expect(getSlotHeatmapAppearance(25, 25).className).toBe(
      "text-primary-content",
    );
  });

  it("does not force primary content text color for partial availability", () => {
    expect(getSlotHeatmapAppearance(12, 25).className).toBeUndefined();
  });
});

describe("getSlotHeatmapAppearanceColorblindSafe", () => {
  it("uses the base background without an inline style for empty slots", () => {
    const emptyAppearance = getSlotHeatmapAppearanceColorblindSafe(0, 10);

    expect(emptyAppearance.className).toBe("bg-base-100");
    expect(emptyAppearance.style).toBeUndefined();
  });

  it("uses a stepped class for low availability", () => {
    expect(getSlotHeatmapAppearanceColorblindSafe(3, 10).className).toBe(
      "bg-primary/20",
    );
  });

  it("caps primary opacity for full availability", () => {
    expect(getSlotHeatmapAppearanceColorblindSafe(10, 10).className).toBe(
      "bg-primary/75 text-primary-content",
    );
  });
});

describe("slot intersections and explicit availability", () => {
  const users = [
    { id: "a", name: "A", slots: new Set(["2026-07-16_09:00"]) },
    {
      id: "b",
      name: "B",
      slots: new Set(["2026-07-16_09:00", "2026-07-16_10:00"]),
    },
    { id: "c", name: "C", slots: new Set(["2026-07-16_10:00"]) },
  ];
  const allowedSlots = new Set([
    "2026-07-16_09:00",
    "2026-07-16_09:30",
    "2026-07-16_10:00",
  ]);
  const viewedUserIds = new Set(["a", "b", "c"]);
  const usersWithNonResponder = [
    ...users,
    { id: "d", name: "D", slots: new Set<string>() },
  ];

  it("marks only the tied slots with the best intersection count", () => {
    const bestIntersection = getBestIntersection(
      users,
      ["2026-07-16"],
      ["09:00", "09:30", "10:00"],
      allowedSlots,
      viewedUserIds,
    );

    expect(bestIntersection.maxCount).toBe(2);
    expect(bestIntersection.slotKeys).toEqual(
      new Set(["2026-07-16_09:00", "2026-07-16_10:00"]),
    );
  });

  it("keeps all tied best slots at the maximum participant threshold", () => {
    const strictIntersection = getIntersectionAtMinParticipants(
      users,
      ["2026-07-16"],
      ["09:00", "09:30", "10:00"],
      allowedSlots,
      viewedUserIds,
      2,
    );

    expect(strictIntersection.slotKeys).toEqual(
      new Set(["2026-07-16_09:00", "2026-07-16_10:00"]),
    );
  });

  it("includes every non-empty slot at the minimum participant threshold", () => {
    const allAvailableSlots = getIntersectionAtMinParticipants(
      users,
      ["2026-07-16"],
      ["09:00", "09:30", "10:00"],
      allowedSlots,
      viewedUserIds,
      1,
    );

    expect(allAvailableSlots.slotKeys).toEqual(
      new Set(["2026-07-16_09:00", "2026-07-16_10:00"]),
    );
  });

  it("returns no matching slots for empty availability", () => {
    const emptyIntersection = getIntersectionAtMinParticipants(
      [],
      ["2026-07-16"],
      ["09:00"],
      new Set(["2026-07-16_09:00"]),
      new Set(),
      1,
    );

    expect(emptyIntersection.maxCount).toBe(0);
    expect(emptyIntersection.slotKeys.size).toBe(0);
  });

  it("does not increase intersection counts for participants without explicit slots", () => {
    const bestIntersection = getBestIntersection(
      users,
      ["2026-07-16"],
      ["09:00", "09:30", "10:00"],
      allowedSlots,
      viewedUserIds,
    );
    const bestIntersectionWithoutNonResponder = getBestIntersection(
      usersWithNonResponder,
      ["2026-07-16"],
      ["09:00", "09:30", "10:00"],
      allowedSlots,
      new Set(["a", "b", "c", "d"]),
    );

    expect(bestIntersectionWithoutNonResponder.maxCount).toBe(
      bestIntersection.maxCount,
    );
  });

  it("does not treat empty availability as explicit", () => {
    expect(
      userHasExplicitAvailability(
        { id: "d", name: "D", slots: new Set() },
        null,
        new Set(),
      ),
    ).toBe(false);
  });

  it("ignores participants without explicit availability in slot counts", () => {
    expect(
      countExplicitSlotAvailability(
        usersWithNonResponder,
        new Set(["a", "b", "c", "d"]),
        "2026-07-16_09:00",
        null,
        new Set(),
      ),
    ).toBe(2);
  });

  it("can exclude the participant whose availability is being edited", () => {
    expect(
      countExplicitSlotAvailability(
        usersWithNonResponder,
        new Set(["a", "b", "c", "d"]),
        "2026-07-16_09:00",
        "a",
        new Set(["2026-07-16_09:00"]),
        "a",
      ),
    ).toBe(1);
  });

  it("includes only the correct participants with explicit availability in slot details", () => {
    const explicitParticipants = getParticipantsWithExplicitSlot(
      usersWithNonResponder,
      "2026-07-16_09:00",
      null,
      new Set(),
    );

    expect(explicitParticipants).toHaveLength(2);
    expect(
      explicitParticipants.every((user) => user.id === "a" || user.id === "b"),
    ).toBe(true);
  });
});

describe("getSlotKeysBetween", () => {
  const dates = ["2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
  const times = ["09:00", "09:30", "10:00", "10:30"];

  it("returns the same slot itself", () => {
    expect(
      getSlotKeysBetween("2026-07-16_09:00", "2026-07-16_09:00", dates, times),
    ).toEqual(["2026-07-16_09:00"]);
  });

  it("fills skipped date cells during a horizontal drag", () => {
    expect(
      getSlotKeysBetween("2026-07-16_09:00", "2026-07-18_09:00", dates, times),
    ).toEqual(["2026-07-16_09:00", "2026-07-17_09:00", "2026-07-18_09:00"]);
  });

  it("fills skipped time cells during a vertical drag", () => {
    expect(
      getSlotKeysBetween("2026-07-16_09:00", "2026-07-16_10:30", dates, times),
    ).toEqual([
      "2026-07-16_09:00",
      "2026-07-16_09:30",
      "2026-07-16_10:00",
      "2026-07-16_10:30",
    ]);
  });

  it("fills intermediate cells during a diagonal drag", () => {
    expect(
      getSlotKeysBetween("2026-07-16_09:00", "2026-07-18_10:30", dates, times),
    ).toContain("2026-07-17_09:30");
  });
});
