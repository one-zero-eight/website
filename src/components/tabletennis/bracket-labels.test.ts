import { describe, expect, it } from "vitest";
import {
  buildStructure,
  ordinal,
  roundLabel,
  standingsToTop,
  topsEqual,
} from "./bracket-utils";

describe("roundLabel", () => {
  const main = buildStructure(12).sections.find((s) => s.placeFrom === 1)!;

  it("names rounds from the final backwards", () => {
    expect([0, 1, 2, 3].map((r) => roundLabel(main, r))).toEqual([
      "1/8",
      "1/4",
      "1/2",
      "Final",
    ]);
  });

  it("calls a first round padded with byes Round 1", () => {
    expect(roundLabel(main, 0, true)).toBe("Round 1");
    expect(roundLabel(main, 1, true)).toBe("1/4");
  });

  it("names a placement match by its place", () => {
    const third = buildStructure(8).sections.find((s) => s.placeFrom === 3)!;
    expect(roundLabel(third, 0, true)).toBe("3rd place");
  });
});

describe("standings helpers", () => {
  it("compares tops regardless of key order", () => {
    const top = standingsToTop([
      { place: 2, id: "b" },
      { place: 1, id: "a" },
    ]);
    expect(topsEqual(top, { "1": "a", "2": "b" })).toBe(true);
    expect(topsEqual(top, { "1": "b", "2": "a" })).toBe(false);
    expect(topsEqual(top, { "1": "a" })).toBe(false);
  });

  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
    ]);
  });
});
