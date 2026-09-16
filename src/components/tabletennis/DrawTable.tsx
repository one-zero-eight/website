import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";
import {
  bucketSeries,
  monotonePath,
  parseDate,
  type Bucket,
  type RatingPoint,
  type SeriesPoint,
} from "./rating-series";

export { parseDate, type RatingPoint };

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLabel(time: number, bucket: Bucket): string {
  const d = new Date(time);
  if (bucket === "month")
    return `${padDate(d.getMonth() + 1)}.${d.getFullYear()}`;
  return `${padDate(d.getDate())}.${padDate(d.getMonth() + 1)}`;
}

function formatTooltip(point: SeriesPoint): string {
  const d = new Date(point.time);
  const day = `${padDate(d.getDate())}.${padDate(d.getMonth() + 1)}.${d.getFullYear()}`;
  if (point.bucket === "week") return `Week of ${day}`;
  if (point.bucket === "month") return formatLabel(point.time, "month");
  return day;
}

function ChoosePeriod({
  period,
  onChange,
}: {
  period: string;
  onChange: (p: "month" | "year" | "all") => void;
}) {
  return (
    <div className="tabs tabs-box bg-base-200 w-fit text-sm md:text-base">
      {[
        { key: "month" as const, label: "Month" },
        { key: "year" as const, label: "Year" },
        { key: "all" as const, label: "All time" },
      ].map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={cn(
            "tab rounded-btn",
            period === tab.key ? "bg-[#712BB2] text-white" : "",
          )}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function RatingChart({ series }: { series: SeriesPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const w = 600,
    h = 300;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const minScore = Math.min(...series.map((d) => d.score)) - 20;
  const maxScore = Math.max(...series.map((d) => d.score)) + 20;
  const scoreRange = maxScore - minScore || 1;

  const minTime = series[0]!.time;
  const maxTime = series[series.length - 1]!.time;
  const timeRange = maxTime - minTime;

  const points = series.map((d) => ({
    x:
      timeRange === 0
        ? pad.left + cw / 2
        : pad.left + ((d.time - minTime) / timeRange) * cw,
    y: pad.top + ch - ((d.score - minScore) / scoreRange) * ch,
  }));

  const gridCount = 5;
  const labelCount = Math.min(series.length, 5);
  const labelIdx = Array.from({ length: labelCount }, (_, i) =>
    labelCount === 1
      ? 0
      : Math.round(((series.length - 1) * i) / (labelCount - 1)),
  );

  const line = monotonePath(points);
  const area =
    points.length > 1
      ? `${line} L${points[points.length - 1]!.x},${pad.top + ch} L${points[0]!.x},${pad.top + ch} Z`
      : "";

  const hoveredPoint = hovered === null ? null : points[hovered];
  const hoveredData = hovered === null ? null : series[hovered];

  function pickNearest(clientX: number, rect: DOMRect) {
    const x = ((clientX - rect.left) / rect.width) * w;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[best]!.x - x)) best = i;
    });
    setHovered(best);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="text-base-content h-auto w-full touch-pan-y"
        onPointerMove={(e) =>
          pickNearest(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onPointerDown={(e) =>
          pickNearest(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="rating-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#712BB2" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#712BB2" stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({ length: gridCount + 1 }, (_, i) => {
          const y = pad.top + (ch / gridCount) * i;
          const score = maxScore - (scoreRange / gridCount) * i;
          return (
            <g key={`h-${i}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={w - pad.right}
                y2={y}
                stroke="#712BB2"
                strokeOpacity={0.35}
                strokeWidth={0.5}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                fill="currentColor"
                fontSize={10}
                textAnchor="end"
              >
                {Math.round(score)}
              </text>
            </g>
          );
        })}
        {labelIdx.map((idx, i) => (
          <text
            key={`x-${i}`}
            x={points[idx]!.x}
            y={h - pad.bottom + 16}
            fill="currentColor"
            fontSize={10}
            textAnchor="middle"
          >
            {formatLabel(series[idx]!.time, series[idx]!.bucket)}
          </text>
        ))}
        {area && <path d={area} fill="url(#rating-area)" />}
        <path
          d={line}
          fill="none"
          stroke="#712BB2"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.length <= 40 &&
          points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 5 : 3}
              fill="white"
              stroke="#712BB2"
              strokeWidth={2}
            />
          ))}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={pad.top}
            x2={hoveredPoint.x}
            y2={pad.top + ch}
            stroke="#712BB2"
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        )}
      </svg>
      {hoveredPoint && hoveredData && (
        <div
          className="bg-base-100 pointer-events-none absolute rounded-lg px-3 py-2 text-sm whitespace-nowrap shadow-lg"
          style={{
            left: `${Math.min(85, Math.max(15, (hoveredPoint.x / w) * 100))}%`,
            top: (hoveredPoint.y / h) * 100 + "%",
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <p className="text-base-content font-semibold">
            {formatTooltip(hoveredData)}
          </p>
          <p className="text-base-content/70">Rating: {hoveredData.score}</p>
        </div>
      )}
    </div>
  );
}

export function ScoreTable({ data = [] }: { data?: RatingPoint[] }) {
  const [period, setPeriod] = useState<"month" | "year" | "all">("all");

  const series = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
    );
    if (sorted.length === 0) return null;
    const now = parseDate(sorted[sorted.length - 1]!.date);
    let filtered = sorted;
    if (period !== "all") {
      const cutoff = new Date(now);
      if (period === "month") cutoff.setMonth(cutoff.getMonth() - 1);
      else cutoff.setFullYear(cutoff.getFullYear() - 1);
      filtered = sorted.filter((d) => parseDate(d.date) >= cutoff);
    }
    return bucketSeries(filtered);
  }, [data, period]);

  if (series === null) {
    return (
      <div className="bg-base-200 rounded-lg px-10 py-7">
        <h3 className="text-base-content text-xl font-light md:text-2xl">
          Score Timeline
        </h3>
        <p className="text-base-content/50 mt-4 text-center text-sm">No data</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg px-6 py-7 md:px-10">
      <div className="flex flex-col gap-4 pb-7 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base-content text-xl font-light md:text-2xl">
          Score Timeline
        </h3>
        <ChoosePeriod period={period} onChange={setPeriod} />
      </div>
      {series.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-center text-sm">
          No data for the selected period
        </p>
      ) : (
        <RatingChart series={series} />
      )}
    </div>
  );
}
