import { cn } from "@/lib/ui/cn";
import {
  type BracketMatch,
  type BracketSection,
  type Side,
  roundLabel,
} from "./bracket-utils";

const CARD_W = 164;
const CARD_H = 64;
const COL_GAP = 36;
const ROW_GAP = 14;
const HEADER_H = 28;

function SideRow({
  side,
  score,
  won,
  showScore,
  getName,
}: {
  side: Side;
  score: number;
  won: boolean;
  showScore: boolean;
  getName: (id: string) => string;
}) {
  const label =
    side.kind === "player"
      ? getName(side.id)
      : side.kind === "bye"
        ? "—"
        : "TBD";
  return (
    <div
      className={cn(
        "flex h-1/2 items-center gap-2 px-2.5",
        won && "bg-[#712BB2]/15",
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          side.kind !== "player" && "text-base-content/35",
          won ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
      {showScore && (
        <span
          className={cn(
            "text-sm tabular-nums",
            won ? "font-semibold text-[#712BB2]" : "text-base-content/50",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function MatchCard({
  match,
  getName,
  onSelect,
  className,
  style,
}: {
  match: BracketMatch;
  getName: (id: string) => string;
  onSelect?: (match: BracketMatch) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const done = match.status === "done";
  const ready = match.status === "ready";
  const clickable = (ready || done) && !!onSelect;
  const firstWon =
    done && match.winner.kind === "player" && match.side1.kind === "player"
      ? match.winner.id === match.side1.id
      : false;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect?.(match)}
      style={{ width: CARD_W, height: CARD_H, ...style }}
      className={cn(
        "bg-base-100 flex flex-col overflow-hidden rounded-xl border text-left transition-all",
        ready
          ? "border-[#712BB2] shadow-[0_0_0_3px_rgba(113,43,178,0.15)]"
          : "border-base-300",
        match.status === "bye" && "opacity-50",
        match.status === "waiting" && "border-dashed",
        clickable && "active:scale-[0.98]",
        !clickable && "cursor-default",
        className,
      )}
    >
      <SideRow
        side={match.side1}
        score={match.score1}
        won={done && firstWon}
        showScore={done}
        getName={getName}
      />
      <div className="bg-base-300 h-px w-full" />
      <SideRow
        side={match.side2}
        score={match.score2}
        won={done && !firstWon}
        showScore={done}
        getName={getName}
      />
    </button>
  );
}

/**
 * Tree graph of one bracket section. Rounds are columns; the page itself never
 * scrolls sideways, only this container does.
 */
export function BracketGraph({
  section,
  matches,
  getName,
  onSelect,
}: {
  section: BracketSection;
  matches: Map<string, BracketMatch>;
  getName: (id: string) => string;
  onSelect?: (match: BracketMatch) => void;
}) {
  const rounds = section.matchIds.map((ids) =>
    ids.map((id) => matches.get(id)!),
  );
  const firstCount = rounds[0]?.length ?? 1;
  const height = HEADER_H + firstCount * CARD_H + (firstCount - 1) * ROW_GAP;
  const width = rounds.length * CARD_W + (rounds.length - 1) * COL_GAP;

  // vertical centre of match i in round r: halfway between its two feeders
  const centerY = (round: number, index: number) => {
    const span = 2 ** round;
    const first = index * span;
    const last = first + span - 1;
    const top = (i: number) => HEADER_H + i * (CARD_H + ROW_GAP);
    return (top(first) + top(last) + CARD_H) / 2;
  };
  const colX = (round: number) => round * (CARD_W + COL_GAP);

  const lines: { d: string; active: boolean }[] = [];
  rounds.forEach((ms, r) => {
    if (r === 0) return;
    ms.forEach((m, i) => {
      const x2 = colX(r);
      const y2 = centerY(r, i);
      for (const child of [i * 2, i * 2 + 1]) {
        const feeder = rounds[r - 1]![child]!;
        const x1 = colX(r - 1) + CARD_W;
        const y1 = centerY(r - 1, child);
        const mx = x1 + COL_GAP / 2;
        lines.push({
          d: `M${x1},${y1} H${mx} V${y2} H${x2}`,
          active: feeder.status === "done" || feeder.status === "bye",
        });
      }
    });
  });

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="relative" style={{ width, height }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden
        >
          {lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              strokeWidth={1.5}
              className={
                l.active ? "stroke-[#712BB2]" : "stroke-base-content/15"
              }
            />
          ))}
        </svg>
        {rounds.map((ms, r) => (
          <div key={r}>
            <div
              className="text-base-content/50 absolute top-0 text-center text-[11px] font-medium tracking-wide uppercase"
              style={{ left: colX(r), width: CARD_W }}
            >
              {roundLabel(
                section,
                r,
                ms.some((m) => m.status === "bye"),
              )}
            </div>
            {ms.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                getName={getName}
                onSelect={onSelect}
                className="absolute"
                style={{ left: colX(r), top: centerY(r, i) - CARD_H / 2 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
