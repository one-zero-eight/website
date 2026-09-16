import { describe, expect, it } from "vitest";
import { bucketSeries, monotoneSegments } from "./rating-series";

const at = (day: number, hour: number, score: number, month = 9) => ({
  date: new Date(2026, month - 1, day, hour, 0).toISOString(),
  score,
});

describe("bucketSeries", () => {
  it("keeps one point per day with the rating at the end of the day", () => {
    const series = bucketSeries([
      at(13, 18, 120),
      at(13, 19, 90),
      at(13, 20, 110), // closes the 13th
      at(14, 10, 130),
    ]);
    expect(series.map((p) => p.score)).toEqual([110, 130]);
    expect(series.every((p) => p.bucket === "day")).toBe(true);
  });

  it("switches to weeks for long periods", () => {
    const points = Array.from({ length: 90 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i, 12).toISOString(),
      score: 100 + i,
    }));
    const series = bucketSeries(points, 31);
    expect(series[0]!.bucket).toBe("week");
    expect(series.length).toBeLessThanOrEqual(31);
    // the last point still shows the latest rating
    expect(series.at(-1)!.score).toBe(189);
  });

  it("switches to months when even weeks are too many", () => {
    const points = Array.from({ length: 400 }, (_, i) => ({
      date: new Date(2025, 0, 1 + i, 12).toISOString(),
      score: i,
    }));
    const series = bucketSeries(points, 31);
    expect(series[0]!.bucket).toBe("month");
    expect(series.at(-1)!.score).toBe(399);
  });

  it("reads the backend date format", () => {
    const series = bucketSeries([
      { date: "2026-09-13 18:21:56.373067+00:00", score: 100 },
    ]);
    expect(series).toHaveLength(1);
  });
});

describe("monotoneSegments", () => {
  it("never overshoots between two values", () => {
    const pts = [
      { x: 0, y: 100 },
      { x: 10, y: 20 },
      { x: 20, y: 90 },
      { x: 30, y: 90 },
      { x: 40, y: 10 },
    ];
    monotoneSegments(pts).forEach((s, i) => {
      const lo = Math.min(pts[i]!.y, pts[i + 1]!.y);
      const hi = Math.max(pts[i]!.y, pts[i + 1]!.y);
      for (const y of [s.c1y, s.c2y]) {
        expect(y).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(y).toBeLessThanOrEqual(hi + 1e-9);
      }
    });
  });
});
