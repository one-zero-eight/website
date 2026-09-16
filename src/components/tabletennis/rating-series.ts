export type RatingPoint = {
  date: string;
  score: number;
};

export type Bucket = "day" | "week" | "month";

export type SeriesPoint = {
  /** start of the bucket, ms */
  time: number;
  /** rating at the end of the bucket */
  score: number;
  bucket: Bucket;
};

export function parseDate(dateStr: string): Date {
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  if (dateStr.includes("-")) {
    // "2026-09-13 18:21:56.123+00:00" as stored by the backend
    const isoLike = dateStr.replace(" ", "T");
    const d = new Date(isoLike);
    return Number.isNaN(d.getTime()) ? new Date(dateStr + "T00:00:00Z") : d;
  }
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year > 1000 ? year : 2000 + year, month - 1, day);
}

function bucketStart(time: number, bucket: Bucket): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  if (bucket === "week") {
    const shift = (d.getDay() + 6) % 7; // Monday starts the week
    d.setDate(d.getDate() - shift);
  } else if (bucket === "month") {
    d.setDate(1);
  }
  return d.getTime();
}

function closingValues(
  sorted: { time: number; score: number }[],
  bucket: Bucket,
) {
  const buckets = new Map<number, number>();
  for (const p of sorted) buckets.set(bucketStart(p.time, bucket), p.score);
  return [...buckets.entries()].map(([time, score]) => ({
    time,
    score,
    bucket,
  }));
}

/**
 * Collapses rating changes into one point per day (the rating at the end of the day).
 * When there are more days than `maxPoints`, it switches to weeks and then months,
 * so long periods stay readable instead of jumping up and down several times a day.
 */
export function bucketSeries(
  points: RatingPoint[],
  maxPoints = 31,
): SeriesPoint[] {
  const sorted = points
    .map((p) => ({ time: parseDate(p.date).getTime(), score: p.score }))
    .filter((p) => !Number.isNaN(p.time))
    .sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return [];

  for (const bucket of ["day", "week"] as const) {
    const series = closingValues(sorted, bucket);
    if (series.length <= maxPoints) return series;
  }
  return closingValues(sorted, "month");
}

/**
 * Smooth SVG path through the points using monotone cubic interpolation
 * (Fritsch–Carlson): the curve never goes above or below the neighbouring
 * values, so there are no fake peaks between two ratings.
 */
export function monotonePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0]!.x},${pts[0]!.y}`;
  const segments = monotoneSegments(pts);
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (const s of segments) {
    d += ` C${s.c1x},${s.c1y} ${s.c2x},${s.c2y} ${s.x},${s.y}`;
  }
  return d;
}

export function monotoneSegments(pts: { x: number; y: number }[]) {
  const n = pts.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1]!.x - pts[i]!.x;
    slopes.push(dx === 0 ? 0 : (pts[i + 1]!.y - pts[i]!.y) / dx);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0]!;
  tangents[n - 1] = slopes[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    tangents[i] =
      slopes[i - 1]! * slopes[i]! <= 0 ? 0 : (slopes[i - 1]! + slopes[i]!) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / slopes[i]!;
    const b = tangents[i + 1]! / slopes[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangents[i] = t * a * slopes[i]!;
      tangents[i + 1] = t * b * slopes[i]!;
    }
  }

  return pts.slice(1).map((p, i) => {
    const prev = pts[i]!;
    const h = (p.x - prev.x) / 3;
    return {
      c1x: prev.x + h,
      c1y: prev.y + tangents[i]! * h,
      c2x: p.x - h,
      c2y: p.y - tangents[i + 1]! * h,
      x: p.x,
      y: p.y,
    };
  });
}
