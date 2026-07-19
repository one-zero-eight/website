import { cn } from "@/lib/ui/cn";
import { useState } from "react";

export function parseDate(dateStr: string): Date {
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  if (dateStr.includes("-")) {
    return new Date(dateStr + "T00:00:00Z");
  }
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year > 1000 ? year : 2000 + year, month - 1, day);
}

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${padDate(d.getDate())}.${padDate(d.getMonth() + 1)}`;
}

function downsampleData(data: RatingPoint[], maxPoints: number): RatingPoint[] {
  if (data.length <= maxPoints) return data;
  const step = (data.length - 1) / (maxPoints - 1);
  return Array.from(
    { length: maxPoints },
    (_, i) => data[Math.round(step * i)]!,
  );
}

export type RatingPoint = {
  date: string;
  score: number;
};

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

function RatingChart({ data }: { data: RatingPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    score: number;
  } | null>(null);

  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const w = 600,
    h = 300;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const sorted = [...data].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
  );
  if (sorted.length === 0) return null;

  const minScore = Math.min(...sorted.map((d) => d.score)) - 20;
  const maxScore = Math.max(...sorted.map((d) => d.score)) + 20;
  const scoreRange = maxScore - minScore || 1;

  const dates = sorted.map((d) => parseDate(d.date).getTime());
  const minDate = dates[0]!;
  const maxDate = dates[dates.length - 1]!;
  const dateRange = maxDate - minDate || 1;

  const gridCount = 5;
  const xLabels: number[] = [];
  for (let i = 0; i <= gridCount; i++) {
    const t = i / gridCount;
    const idx = Math.round((sorted.length - 1) * t);
    xLabels.push(idx);
  }

  const points = sorted.map((d) => ({
    x: pad.left + ((parseDate(d.date).getTime() - minDate) / dateRange) * cw,
    y: pad.top + ch - ((d.score - minScore) / scoreRange) * ch,
    date: d.date,
    score: d.score,
  }));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="text-base-content h-auto w-full"
      >
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
        {xLabels.map((idx, i) => {
          const x = pad.left + (cw / gridCount) * i;
          return (
            <g key={`v-${i}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={h - pad.bottom}
                stroke="#712BB2"
                strokeWidth={0.5}
              />
              <text
                x={x}
                y={h - pad.bottom + 16}
                fill="currentColor"
                fontSize={10}
                textAnchor="middle"
              >
                {formatDateLabel(sorted[idx]!.date)}
              </text>
            </g>
          );
        })}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#712BB2"
          strokeWidth={2}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="white"
            stroke="#712BB2"
            strokeWidth={2}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(p)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>
      {hoveredPoint && (
        <div
          className="bg-base-100 pointer-events-none absolute rounded-lg px-3 py-2 text-sm shadow-lg"
          style={{
            left: (hoveredPoint.x / w) * 100 + "%",
            top: (hoveredPoint.y / h) * 100 + "%",
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <p className="text-base-content font-semibold">
            {formatDateLabel(hoveredPoint.date)}
          </p>
          <p className="text-base-content/70">Rating: {hoveredPoint.score}</p>
        </div>
      )}
    </div>
  );
}

export function ScoreTable({ data = [] }: { data?: RatingPoint[] }) {
  const [period, setPeriod] = useState<"month" | "year" | "all">("all");

  const sorted = [...data].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg px-10 py-7">
        <h3 className="text-base-content text-xl font-light md:text-2xl">
          Score Timeline
        </h3>
        <p className="text-base-content/50 mt-4 text-center text-sm">No data</p>
      </div>
    );
  }

  const now = parseDate(sorted[sorted.length - 1]!.date);

  let filteredData: RatingPoint[];
  if (period === "month") {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 1);
    filteredData = sorted.filter((d) => parseDate(d.date) >= cutoff);
  } else if (period === "year") {
    const cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    filteredData = sorted.filter((d) => parseDate(d.date) >= cutoff);
  } else {
    filteredData = sorted;
  }

  const displayData = downsampleData(filteredData, 20);

  return (
    <div className="bg-base-200 rounded-lg px-10 py-7">
      <div className="flex flex-col gap-4 pb-7 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base-content text-xl font-light md:text-2xl">
          Score Timeline
        </h3>
        <ChoosePeriod period={period} onChange={setPeriod} />
      </div>
      {displayData.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-center text-sm">
          No data for the selected period
        </p>
      ) : (
        <RatingChart data={displayData} />
      )}
    </div>
  );
}
