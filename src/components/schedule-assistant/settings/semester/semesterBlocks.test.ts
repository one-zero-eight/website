import { describe, expect, it } from "vitest";
import {
  dateToDay,
  firstAvailableBlockPeriod,
  sortSemesterBlocks,
  splitSemesterInTwo,
  validateSemesterBlocks,
} from "./semesterBlocks.ts";

const semester = { start_date: "2026-09-01", end_date: "2026-09-30" };

describe("semester blocks", () => {
  it("splits inclusive dates without overlap or gaps", () => {
    const blocks = splitSemesterInTwo(semester);
    expect(
      blocks.map(({ start_date, end_date }) => [start_date, end_date]),
    ).toEqual([
      ["2026-09-01", "2026-09-15"],
      ["2026-09-16", "2026-09-30"],
    ]);
    expect(validateSemesterBlocks(semester, blocks)).toBeNull();
    expect(splitSemesterInTwo(semester)).toEqual(blocks);
  });

  it("keeps an odd extra day in the first block and handles leap days", () => {
    expect(
      splitSemesterInTwo({
        start_date: "2028-02-28",
        end_date: "2028-03-01",
      }).map(({ start_date, end_date }) => [start_date, end_date]),
    ).toEqual([
      ["2028-02-28", "2028-02-29"],
      ["2028-03-01", "2028-03-01"],
    ]);
  });

  it("cannot split a one-day or invalid semester", () => {
    expect(
      splitSemesterInTwo({ start_date: "2026-09-01", end_date: "2026-09-01" }),
    ).toEqual([]);
    expect(
      splitSemesterInTwo({ start_date: "2026-09-30", end_date: "2026-09-01" }),
    ).toEqual([]);
    expect(Number.isNaN(dateToDay("2026-02-30"))).toBe(true);
  });

  it("orders blocks by date without mutating the original", () => {
    const blocks = splitSemesterInTwo(semester).reverse();
    expect(sortSemesterBlocks(blocks)[0].id).toBe("block-1");
    expect(blocks[0].id).toBe("block-2");
  });

  it("rejects overlapping boundaries, missing names, reversed or out-of-term dates", () => {
    const [first, second] = splitSemesterInTwo(semester);
    expect(
      validateSemesterBlocks(semester, [
        first,
        { ...second, start_date: first.end_date },
      ]),
    ).toContain("пересекаться");
    expect(
      validateSemesterBlocks(semester, [{ ...first, name: " " }]),
    ).toContain("название");
    expect(
      validateSemesterBlocks(semester, [
        { ...first, start_date: "2026-09-16" },
      ]),
    ).toContain("корректные даты");
    expect(
      validateSemesterBlocks(semester, [
        { ...first, start_date: "2026-08-31" },
      ]),
    ).toContain("внутри семестра");
    expect(
      validateSemesterBlocks(semester, [first, { ...second, id: first.id }]),
    ).toContain("уникальными");
  });

  it("finds uncovered dates and refuses adding into a fully covered semester", () => {
    const blocks = splitSemesterInTwo(semester);
    expect(firstAvailableBlockPeriod(semester, blocks)).toBeNull();
    expect(firstAvailableBlockPeriod(semester, [blocks[1]])).toEqual({
      start_date: "2026-09-01",
      end_date: "2026-09-15",
    });
  });
});
