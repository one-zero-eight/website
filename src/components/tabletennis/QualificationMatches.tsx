import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import {
  type Player,
  type GameData,
  type MatchSlot,
  type Bracket,
  computeStats,
  buildBracketMatches,
  tryAdvance,
  reconstructBracket,
} from "./bracket-utils";

export function QualificationMatches({
  players,
  validationGames,
  valTop,
  tourId,
  qualificationGames,
  onTourRefetch,
  onLock,
}: {
  players: { name: string; id: string }[];
  validationGames: GameData[];
  valTop?: Record<string, string>;
  tourId: string;
  qualificationGames: GameData[];
  onTourRefetch: () => void;
  onLock: () => void;
}) {
  const { showError } = useToast();
  const scoresRef = useRef<Record<string, [number, number]>>({});

  const { mutateAsync: createGame } = $tabletennis.useMutation(
    "post",
    "/reg-game",
    {
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );
  const { mutateAsync: finishGame } = $tabletennis.useMutation(
    "post",
    "/finish-game",
    {
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );
  const { mutateAsync: changeQualTop } = $tabletennis.useMutation(
    "post",
    "/reg-tour/change-qual-top",
    {
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  // ── seeding from valTop only ─────────────────────────────────
  const initialSeeded = useMemo(() => {
    if (valTop && Object.keys(valTop).length > 0) {
      const ordered: Player[] = [];
      const used = new Set<string>();
      const places = Object.entries(valTop).sort(
        ([a], [b]) => Number(a) - Number(b),
      );
      for (const [, playerId] of places) {
        const p = players.find((pp) => pp.id === playerId);
        if (p) {
          ordered.push(p);
          used.add(p.id);
        }
      }
      for (const p of players) {
        if (!used.has(p.id)) ordered.push(p);
      }
      return ordered;
    }
    return computeStats(players, validationGames).map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }, [valTop, validationGames, players]);

  const [matches, setMatches] = useState<MatchSlot[]>([]);
  const [scores, setScores] = useState<Record<string, [number, number]>>({});
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [locked, setLocked] = useState(() => qualificationGames.length > 0);
  const reconstructedRef = useRef(false);
  const prevTourIdRef = useRef(tourId);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // ── reset bracket guard when tour changes ─────────────────
  useEffect(() => {
    if (tourId !== prevTourIdRef.current) {
      reconstructedRef.current = false;
      prevTourIdRef.current = tourId;
    }
  }, [tourId]);

  const playerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.id, p.name);
    return m;
  }, [players]);

  function getPlayerName(id: string | null): string {
    if (!id) return "TBD";
    return playerMap.get(id) ?? id;
  }

  // ── reconstruct bracket from server games ───────────────────
  useEffect(() => {
    if (reconstructedRef.current) return;
    if (initialSeeded.length === 0) return;
    if (qualificationGames.length === 0 && !locked) return;

    reconstructedRef.current = true;

    if (qualificationGames.length > 0) {
      const result = reconstructBracket(initialSeeded, qualificationGames);
      setMatches(result.matches);
      setScores(result.scores);
      setLocked(true);
    }
  }, [tourId, initialSeeded, qualificationGames, locked]);

  // ── derived lists ──────────────────────────────────────────
  const activeMatches = useMemo(
    () =>
      matches
        .filter((m) => !m.completed && m.bracket !== "placement")
        .sort((a, b) => a.round - b.round),
    [matches],
  );

  const completedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.completed && m.bracket !== "placement")
        .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id)),
    [matches],
  );

  const placementMatches = useMemo(
    () =>
      matches
        .filter((m) => m.bracket === "placement" && m.completed)
        .sort((a, b) => (a.placeLabel ?? "").localeCompare(b.placeLabel ?? "")),
    [matches],
  );

  // ── score change ──────────────────────────────────────────
  function handleScoreChange(matchId: string, player: 1 | 2, value: string) {
    setScores((prev) => {
      const cur = prev[matchId] ?? [0, 0];
      const v = Math.max(0, Number(value) || 0);
      const next: [number, number] = player === 1 ? [v, cur[1]] : [cur[0], v];
      return { ...prev, [matchId]: next };
    });
  }

  // ── lock seeding + generate bracket ──────────────────────
  function handleLock() {
    if (locked || initialSeeded.length < 2) return;
    setLocked(true);
    if (matches.length === 0) {
      const { matches: newMatches, scores: newScores } =
        buildBracketMatches(initialSeeded);
      setMatches(newMatches);
      setScores(newScores);
    }
    onLock();
  }

  // ── complete match + auto-advance ─────────────────────────
  async function handleComplete(matchId: string) {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.completed) return;
    const ms = scoresRef.current[matchId] ?? [0, 0];
    if (ms[0] === ms[1]) {
      showError("Draw", "Draws are not allowed in table tennis");
      return;
    }
    setFinishingId(matchId);

    let gameId = match.game_id;
    if (!gameId && match.player1_id && match.player2_id) {
      try {
        const res = await createGame({
          params: {
            query: {
              tour_id: tourId,
              tip: "cval" as const,
              player1_id: match.player1_id,
              player2_id: match.player2_id,
            },
          },
        } as any);
        gameId =
          (res as any)?.id ?? (res as any)?._id ?? (res as any)?.game_id ?? "";
      } catch {
        setFinishingId(null);
        return;
      }
    }

    if (gameId) {
      try {
        await finishGame({
          params: {
            query: {
              game_id: gameId,
              s1: ms[0],
              s2: ms[1],
              tour_id: tourId,
            },
          },
        } as any);
      } catch {
        setFinishingId(null);
        return;
      }
    }

    const updated = matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            game_id: gameId ?? m.game_id,
            score_player1: ms[0],
            score_player2: ms[1],
            completed: true,
          }
        : m,
    );
    setMatches(updated);
    const newScores = { ...scoresRef.current, [matchId]: ms };
    setScores(newScores);
    setFinishingId(null);
    onTourRefetch?.();

    const advanced = tryAdvance(updated, newScores);
    if (advanced) {
      setMatches(advanced.matches);
      setScores(advanced.scores);
      syncQualTop(advanced.matches);
    }
  }

  async function syncQualTop(currentMatches: MatchSlot[]) {
    const placements = currentMatches
      .filter((m) => m.bracket === "placement" && m.completed && m.placeLabel)
      .sort((a, b) => (a.placeLabel ?? "").localeCompare(b.placeLabel ?? ""));

    if (placements.length === 0) return;

    const top: Record<string, string> = {};
    for (const m of placements) {
      const placeStr = (m.placeLabel ?? "").replace(/\D/g, "");
      if (placeStr && m.player1_id) {
        top[placeStr] = m.player1_id;
      }
    }

    if (Object.keys(top).length === 0) return;

    try {
      await changeQualTop({
        params: { query: { tour_id: tourId } },
        body: top,
      } as any);
    } catch {
      /* error toast from onError */
    }
  }

  // ── render: seeding ───────────────────────────────────────
  function renderSeeding() {
    return (
      <div>
        <h3 className="text-base-content mb-3 text-sm font-semibold">
          Seeded players
          <span className="text-base-content/50 ml-2 text-[10px] font-normal">
            (based on validation results)
          </span>
          {locked && (
            <span className="icon-[mdi--lock] text-base-content/30 ml-1 align-middle text-xs" />
          )}
        </h3>
        <div className="flex flex-col gap-1">
          {initialSeeded.map((p, i) => {
            const stats = computeStats(players, validationGames).find(
              (s) => s.id === p.id,
            );
            return (
              <div
                key={p.id}
                className="bg-base-200 rounded-box flex items-center gap-2 px-3 py-2"
              >
                <span className="text-base-content/50 w-5 text-center text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm">{p.name}</span>
                {stats && (
                  <span className="text-base-content/50 text-[10px] tabular-nums">
                    {stats.wins}W / {stats.played}P
                    {stats.played > 0 &&
                      ` (${Math.round((stats.wins / stats.played) * 100)}%)`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {!locked && initialSeeded.length >= 2 && (
          <button
            type="button"
            className="btn btn-soft btn-primary mt-3"
            onClick={handleLock}
          >
            Lock seeding
          </button>
        )}
      </div>
    );
  }

  // ── render: active match card ──────────────────────────────
  function renderActiveCard(m: MatchSlot) {
    const ms = scores[m.id] ?? [m.score_player1, m.score_player2];
    const isFinishing = finishingId === m.id;
    return (
      <div
        key={m.id}
        className="bg-base-200 rounded-box border border-[#712BB2]/30 p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-base-content/50 text-[10px]">
            Round {m.round}
            {m.bracket === "consolation" && " (Consolation)"}
            <span className="ml-1 text-[8px] opacity-50">
              [{m.rankStart}–{m.rankEnd}]
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium">
              {getPlayerName(m.player1_id)}
            </span>
            <input
              type="number"
              min={0}
              value={ms[0]}
              disabled={isFinishing}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleScoreChange(m.id, 1, e.target.value)}
              className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium">
              {getPlayerName(m.player2_id)}
            </span>
            <input
              type="number"
              min={0}
              value={ms[1]}
              disabled={isFinishing}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleScoreChange(m.id, 2, e.target.value)}
              className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-[#712BB2] px-3 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:opacity-40"
            disabled={isFinishing}
            onClick={() => handleComplete(m.id)}
          >
            {isFinishing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Complete"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── render: completed match row ────────────────────────────
  function renderCompletedMatch(m: MatchSlot) {
    const p1 = getPlayerName(m.player1_id);
    const p2 = getPlayerName(m.player2_id);
    const s1 = m.score_player1;
    const s2 = m.score_player2;
    const p1Won = s1 > s2;
    return (
      <div
        key={m.id}
        className="bg-base-200 rounded-box flex items-center gap-2 px-3 py-2"
      >
        <span className="text-[10px] font-medium tabular-nums">
          <span className={cn(p1Won && "text-green-500")}>{p1}</span>
          <span className="text-base-content/30 mx-1.5">
            {s1}:{s2}
          </span>
          <span className={cn(!p1Won && "text-green-500")}>{p2}</span>
        </span>
        <span className="text-base-content/30 ml-auto text-[10px]">
          R{m.round}
          {m.bracket === "consolation" && "C"}
        </span>
      </div>
    );
  }

  // ── group active by round ─────────────────────────────────
  const activeByRound = useMemo(() => {
    const groups = new Map<
      number,
      { bracket: Bracket; matches: MatchSlot[] }[]
    >();
    for (const m of activeMatches) {
      if (!groups.has(m.round)) groups.set(m.round, []);
      const roundGroups = groups.get(m.round)!;
      let bg = roundGroups.find((g) => g.bracket === m.bracket);
      if (!bg) {
        bg = { bracket: m.bracket, matches: [] };
        roundGroups.push(bg);
      }
      bg.matches.push(m);
    }
    return groups;
  }, [activeMatches]);

  // ── group completed by round ───────────────────────────────
  const completedByRound = useMemo(() => {
    const groups = new Map<
      number,
      { bracket: Bracket; matches: MatchSlot[] }[]
    >();
    for (const m of completedMatches) {
      if (!groups.has(m.round)) groups.set(m.round, []);
      const roundGroups = groups.get(m.round)!;
      let bg = roundGroups.find((g) => g.bracket === m.bracket);
      if (!bg) {
        bg = { bracket: m.bracket, matches: [] };
        roundGroups.push(bg);
      }
      bg.matches.push(m);
    }
    return groups;
  }, [completedMatches]);

  const hasActive = activeMatches.length > 0;
  const hasCompleted = completedMatches.length > 0;
  const hasPlacements = placementMatches.length > 0;

  return (
    <div className="flex flex-col gap-6 px-7 py-5">
      {renderSeeding()}

      {!hasActive &&
        !hasCompleted &&
        !hasPlacements &&
        initialSeeded.length < 2 && (
          <p className="text-base-content/50 text-center text-sm">
            Not enough players for qualification bracket.
          </p>
        )}

      {hasActive && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Active matches
          </h3>
          <div className="flex flex-col gap-4">
            {[...activeByRound.entries()]
              .sort(([a], [b]) => a - b)
              .map(([round, groups]) => (
                <div key={round}>
                  <p className="text-base-content/50 mb-2 text-[10px]">
                    Round {round}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((g) => g.matches.map(renderActiveCard))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {hasCompleted && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Completed matches
          </h3>
          <div className="flex flex-col gap-4">
            {[...completedByRound.entries()]
              .sort(([a], [b]) => a - b)
              .map(([round, groups]) => (
                <div key={round}>
                  <p className="text-base-content/50 mb-2 text-[10px]">
                    Round {round}
                  </p>
                  <div className="flex flex-col gap-1">
                    {groups.map((g) => g.matches.map(renderCompletedMatch))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {hasPlacements && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Final placements
          </h3>
          <div className="bg-base-200 rounded-box flex flex-col gap-1 p-3">
            {placementMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {getPlayerName(m.player1_id)}
                </span>
                <span className="text-base-content/50 text-[10px]">
                  {m.placeLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
