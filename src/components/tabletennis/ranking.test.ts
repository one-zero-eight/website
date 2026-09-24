import { describe, expect, it } from "vitest";
import { pageCount, pageSlice, rankByRating } from "./ranking";

const p = (nickname: string, rating: number) => ({ nickname, rating });

describe("rankByRating", () => {
  it("numbers places without gaps for distinct ratings", () => {
    const ranked = rankByRating([p("c", 300), p("a", 500), p("b", 400)]);
    expect(ranked.map((r) => [r.player.nickname, r.place])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("gives equal ratings a shared place and skips after them", () => {
    const ranked = rankByRating([
      p("d", 100),
      p("b", 400),
      p("a", 500),
      p("c", 400),
    ]);
    expect(ranked.map((r) => r.place)).toEqual([1, 2, 2, 4]);
    expect(ranked.map((r) => r.player.nickname)).toEqual(["a", "b", "c", "d"]);
  });

  it("puts everyone on the first place when all ratings are equal", () => {
    const ranked = rankByRating([p("x", 100), p("y", 100), p("z", 100)]);
    expect(ranked.map((r) => r.place)).toEqual([1, 1, 1]);
  });

  it("ranks only the players it is given (hidden ones filtered out first)", () => {
    const all = [p("a", 500), p("hidden", 450), p("b", 400)];
    const visible = all.filter((x) => x.nickname !== "hidden");
    expect(rankByRating(visible).map((r) => r.place)).toEqual([1, 2]);
  });
});

describe("paging", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it("splits into pages of 10", () => {
    expect(pageCount(items.length)).toBe(3);
    expect(pageSlice(items, 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pageSlice(items, 2)).toEqual([20, 21, 22]);
  });

  it("clamps an out-of-range page and handles empty lists", () => {
    expect(pageSlice(items, 9)).toEqual([20, 21, 22]);
    expect(pageSlice(items, -1)[0]).toBe(0);
    expect(pageCount(0)).toBe(1);
    expect(pageSlice([], 0)).toEqual([]);
  });
});
