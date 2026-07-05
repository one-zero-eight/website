import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";

type Player = { name: string; id: string };

type MatchSlot = {
  id: string;
  round: number;
  poolLabel: string;
  player1_id: string | null;
  player2_id: string | null;
  score_player1: number;
  score_player2: number;
  completed: boolean;
  isPlacement: boolean;
  placeLabel: string | null;
};

type EliminatedPlayer = {
  playerId: string;
  round: number;
  bracketType: "winners" | "consolation";
};

function sortBySeed(ids: string[], seedOrder: Map<string, number>): string[] {
  return [...ids].sort(
    (a, b) => (seedOrder.get(a) ?? 999) - (seedOrder.get(b) ?? 999),
  );
}

function pairFromSeed(sortedIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  const n = sortedIds.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    pairs.push([sortedIds[i]!, sortedIds[n - 1 - i]!]);
  }
  return pairs;
}

function getWinner(
  sc: [number, number],
  p1: string,
  p2: string,
): [string, string] {
  return sc[0] > sc[1] ? [p1, p2] : [p2, p1];
}

export function QualificationMatches({
  players,
  validationStats,
}: {
  players: Player[];
  validationStats?: { playerId: string; wins: number; played: number }[];
}) {
  const [seeded, setSeeded] = useState<Player[]>([]);
  const [started, setStarted] = useState(false);

  const [currentRound, setCurrentRound] = useState(1);

  const [matches, setMatches] = useState<MatchSlot[]>([]);
  const [scores, setScores] = useState<Record<string, [number, number]>>({});
  const [eliminated, setEliminated] = useState<EliminatedPlayer[]>([]);

  const seedOrder = useMemo(
    () => new Map(seeded.map((p, i) => [p.id, i])),
    [seeded],
  );
  const playerMap = useMemo(
    () => new Map(seeded.map((p) => [p.id, p])),
    [seeded],
  );
  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  const eliminatedRef = useRef(eliminated);
  eliminatedRef.current = eliminated;

  useEffect(() => {
    if (players.length > 0 && players[0]?.id) {
      const winsMap = new Map(
        (validationStats ?? []).map((s) => [s.playerId, s.wins]),
      );
      const sorted = [...players].sort(
        (a, b) => (winsMap.get(b.id) ?? 0) - (winsMap.get(a.id) ?? 0),
      );
      setSeeded(sorted);
    }
  }, [players, validationStats]);

  function handleMoveUp(index: number) {
    if (index === 0) return;
    setSeeded((prev) => {
      const next = [...prev];
      [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!];
      return next;
    });
  }

  function handleMoveDown(index: number) {
    if (index >= seeded.length - 1) return;
    setSeeded((prev) => {
      const next = [...prev];
      [next[index]!, next[index + 1]!] = [next[index + 1]!, next[index]!];
      return next;
    });
  }

  function computePlacements(
    currentEliminated: EliminatedPlayer[],
    allPlayers: Player[],
    currentMatches: MatchSlot[],
  ): MatchSlot[] {
    const totalPlayers = allPlayers.length;
    const placementMatches: MatchSlot[] = [];

    const placements: {
      playerId: string;
      place: number;
      placeLabel: string;
    }[] = [];

    const champMatch = currentMatches.find((m) => m.poolLabel === "Champion");
    if (champMatch?.player1_id) {
      const alreadyPlaced = currentMatches.some(
        (m) =>
          m.isPlacement &&
          m.placeLabel === "1st place" &&
          m.player1_id === champMatch.player1_id,
      );
      if (!alreadyPlaced) {
        placements.push({
          playerId: champMatch.player1_id,
          place: 1,
          placeLabel: "1st place",
        });
      }
    }

    const wbFinal = currentMatches.filter(
      (m) =>
        m.poolLabel === "Winners" &&
        m.round ===
          Math.max(
            ...currentMatches
              .filter((mm) => mm.poolLabel === "Winners")
              .map((mm) => mm.round),
          ),
    );
    const lastWBMatch = wbFinal.filter((m) => m.completed && m.player2_id);
    if (lastWBMatch.length > 0) {
      const finalMatch = lastWBMatch[lastWBMatch.length - 1]!;
      const sc = scoresRef.current[finalMatch.id] ?? [0, 0];
      const loser =
        sc[0] > sc[1] ? finalMatch.player2_id : finalMatch.player1_id;
      if (loser && !placements.some((p) => p.playerId === loser)) {
        placements.push({
          playerId: loser,
          place: 2,
          placeLabel: "2nd place",
        });
      }
    }

    const cbFinal = currentMatches.filter(
      (m) =>
        m.poolLabel === "Consolation" &&
        m.round ===
          Math.max(
            ...currentMatches
              .filter((mm) => mm.poolLabel === "Consolation")
              .map((mm) => mm.round),
          ),
    );
    const lastCBMatch = cbFinal.filter((m) => m.completed && m.player2_id);
    if (lastCBMatch.length > 0) {
      const finalMatch = lastCBMatch[lastCBMatch.length - 1]!;
      const sc = scoresRef.current[finalMatch.id] ?? [0, 0];
      const winner =
        sc[0] > sc[1] ? finalMatch.player1_id : finalMatch.player2_id;
      const loser =
        sc[0] > sc[1] ? finalMatch.player2_id : finalMatch.player1_id;
      if (winner && !placements.some((p) => p.playerId === winner)) {
        placements.push({
          playerId: winner,
          place: 3,
          placeLabel: "3rd place",
        });
      }
      if (loser && !placements.some((p) => p.playerId === loser)) {
        placements.push({
          playerId: loser,
          place: 4,
          placeLabel: "4th place",
        });
      }
    }

    const eliminatedByRound = [...currentEliminated].sort((a, b) => {
      if (a.round !== b.round) return b.round - a.round;
      return a.bracketType === "consolation" ? -1 : 1;
    });

    let nextPlace = 5;
    for (const ep of eliminatedByRound) {
      if (placements.some((p) => p.playerId === ep.playerId)) continue;
      if (nextPlace > totalPlayers) break;

      const ordinal =
        nextPlace === 5
          ? "5th"
          : nextPlace === 6
            ? "6th"
            : nextPlace === 7
              ? "7th"
              : nextPlace === 8
                ? "8th"
                : `${nextPlace}th`;
      placements.push({
        playerId: ep.playerId,
        place: nextPlace,
        placeLabel: `${ordinal} place`,
      });
      nextPlace++;
    }

    for (const p of placements) {
      placementMatches.push({
        id: `placement_${p.place}`,
        round: 999,
        poolLabel: "Final placement",
        player1_id: p.playerId,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        isPlacement: true,
        placeLabel: p.placeLabel,
      });
    }

    return placementMatches;
  }

  function handleStart() {
    const ids = seeded.map((p) => p.id);
    setCurrentRound(1);
    setMatches([]);
    setScores({});
    setEliminated([]);
    setStarted(true);

    generateRound(ids, [], 1, []);
  }

  function generateRound(
    winners: string[],
    consolation: string[],
    round: number,
    currentEliminated: EliminatedPlayer[],
    latestMatches?: MatchSlot[],
  ) {
    const newMatches: MatchSlot[] = [];
    const newScores: Record<string, [number, number]> = {};
    const matchesSnapshot = latestMatches ?? matches;
    let idx = matchesSnapshot.length;

    const championExists = matchesSnapshot.some(
      (m) => m.poolLabel === "Champion",
    );

    if (winners.length > 1) {
      const wSorted = sortBySeed(winners, seedOrder);
      const pairs = pairFromSeed(wSorted);
      const hasBye = wSorted.length % 2 !== 0;

      for (const [p1, p2] of pairs) {
        idx++;
        const id = `r${round}_m${idx}`;
        newMatches.push({
          id,
          round,
          poolLabel: "Winners",
          player1_id: p1,
          player2_id: p2,
          score_player1: 0,
          score_player2: 0,
          completed: false,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[id] = [0, 0];
      }

      if (hasBye) {
        idx++;
        const byeId = `r${round}_bye${idx}`;
        newMatches.push({
          id: byeId,
          round,
          poolLabel: "Winners",
          player1_id: wSorted[Math.floor(wSorted.length / 2)]!,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[byeId] = [0, 0];
      }
    } else if (winners.length === 1 && !championExists) {
      idx++;
      const id = `r${round}_champ`;
      newMatches.push({
        id,
        round,
        poolLabel: "Champion",
        player1_id: winners[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        isPlacement: true,
        placeLabel: "1st place",
      });
      newScores[id] = [0, 0];
    }

    if (consolation.length > 1) {
      const cSorted = sortBySeed(consolation, seedOrder);
      const pairs = pairFromSeed(cSorted);
      const hasBye = cSorted.length % 2 !== 0;

      for (const [p1, p2] of pairs) {
        idx++;
        const id = `r${round}_m${idx}`;
        newMatches.push({
          id,
          round,
          poolLabel: "Consolation",
          player1_id: p1,
          player2_id: p2,
          score_player1: 0,
          score_player2: 0,
          completed: false,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[id] = [0, 0];
      }

      if (hasBye) {
        idx++;
        const byeId = `r${round}_cbye${idx}`;
        newMatches.push({
          id: byeId,
          round,
          poolLabel: "Consolation",
          player1_id: cSorted[Math.floor(cSorted.length / 2)]!,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[byeId] = [0, 0];
      }
    }

    // If tournament is done (both brackets converged), compute final placements
    const alreadyHasPlacements = matchesSnapshot.some(
      (m) => m.poolLabel === "Final placement",
    );
    const creatingChampion = newMatches.some((m) => m.poolLabel === "Champion");
    const hasChampion = championExists || creatingChampion;
    const tournamentDone =
      winners.length <= 1 && consolation.length <= 1 && hasChampion;
    if (tournamentDone && !alreadyHasPlacements) {
      const placementMatches = computePlacements(currentEliminated, seeded, [
        ...matchesSnapshot,
        ...newMatches,
      ]);
      newMatches.push(...placementMatches);
    }

    setMatches((prev) => [...prev, ...newMatches]);
    setScores((prev) => ({ ...prev, ...newScores }));
  }

  function getPlayerName(id: string | null): string {
    if (!id) return "TBD";
    return playerMap.get(id)?.name ?? id;
  }

  function isResolved(id: string | null): boolean {
    return !!id && playerMap.has(id);
  }

  function handleScoreChange(matchId: string, player: 1 | 2, value: string) {
    setScores((prev) => {
      const cur = prev[matchId] ?? [0, 0];
      const v = Math.max(0, Number(value) || 0);
      return {
        ...prev,
        [matchId]: player === 1 ? [v, cur[1]] : [cur[0], v],
      };
    });
  }

  function handleComplete(matchId: string) {
    setMatches((prev) => {
      const match = prev.find((m) => m.id === matchId);
      if (!match || match.completed) return prev;

      const ms = scoresRef.current[matchId] ?? [0, 0];

      const updated = prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              score_player1: ms[0],
              score_player2: ms[1],
              completed: true,
            }
          : m,
      );

      const round = currentRound;
      const roundMatches = updated.filter((m) => m.round === round);
      const allDone = roundMatches.every((m) => m.completed);

      if (!allDone) return updated;

      const winnersMatches = roundMatches.filter(
        (m) => m.poolLabel === "Winners",
      );
      const consolationMatches = roundMatches.filter(
        (m) => m.poolLabel === "Consolation",
      );

      const wWinners: string[] = [];
      const wLosers: string[] = [];
      const cWinners: string[] = [];
      const cLosers: string[] = [];

      for (const m of winnersMatches) {
        if (!m.player2_id) {
          wWinners.push(m.player1_id!);
        } else {
          const sc =
            m.id === matchId ? ms : (scoresRef.current[m.id] ?? [0, 0]);
          const [winner, loser] = getWinner(sc, m.player1_id!, m.player2_id!);
          wWinners.push(winner);
          wLosers.push(loser);
        }
      }

      for (const m of consolationMatches) {
        if (!m.player2_id) {
          cWinners.push(m.player1_id!);
        } else {
          const sc =
            m.id === matchId ? ms : (scoresRef.current[m.id] ?? [0, 0]);
          const [winner, loser] = getWinner(sc, m.player1_id!, m.player2_id!);
          cWinners.push(winner);
          cLosers.push(loser);
        }
      }

      const newEliminated: EliminatedPlayer[] = [
        ...cLosers.map((id) => ({
          playerId: id,
          round,
          bracketType: "consolation" as const,
        })),
      ];
      const combinedEliminated = [...eliminatedRef.current, ...newEliminated];

      const nextWinners = wWinners;

      // Last loser in winners bracket (final match) gets 2nd place, doesn't go to consolation
      const isFinalWinnersRound =
        wWinners.length === 1 &&
        wLosers.length === 1 &&
        winnersMatches.some((m) => m.player2_id);
      const nextConsolation = [
        ...(isFinalWinnersRound ? [] : wLosers),
        ...cWinners,
      ];

      const nextRound = round + 1;

      setCurrentRound(nextRound);
      setEliminated(combinedEliminated);

      setTimeout(() => {
        generateRound(
          nextWinners,
          nextConsolation,
          nextRound,
          combinedEliminated,
          updated,
        );
      }, 0);

      return updated;
    });
  }

  const rounds = useMemo(() => {
    const groups = new Map<number, MatchSlot[]>();
    for (const m of matches) {
      const list = groups.get(m.round) ?? [];
      list.push(m);
      groups.set(m.round, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  if (!started) {
    return (
      <div className="flex flex-col gap-6 px-7 py-5">
        <h2 className="text-base-content text-xl font-light">Player seeding</h2>
        <p className="text-base-content/70 text-xs md:text-sm">
          Arrange players by strength (strongest at top). The bracket pairs
          strongest vs weakest.
        </p>

        <div className="flex max-w-md flex-col gap-2">
          {seeded.map((p, i) => (
            <div
              key={p.id}
              className="bg-base-200 rounded-box flex items-center gap-3 px-4 py-2"
            >
              <span className="text-base-content/50 w-5 text-xs tabular-nums">
                #{i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {p.name}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(i)}
                  disabled={i === 0}
                  className="btn btn-xs btn-ghost btn-square disabled:opacity-20"
                >
                  <span className="icon-[mdi--chevron-up] text-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(i)}
                  disabled={i >= seeded.length - 1}
                  className="btn btn-xs btn-ghost btn-square disabled:opacity-20"
                >
                  <span className="icon-[mdi--chevron-down] text-lg" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <button
            type="button"
            className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-[#712BB2]/90 md:px-8 md:py-3 md:text-sm"
            onClick={handleStart}
          >
            Start qualification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-7 py-5">
      <h2 className="text-base-content text-xl font-light">Finnish bracket</h2>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map(([round, roundMatchList]) => (
          <div key={round} className="flex min-w-[200px] flex-col gap-4">
            <h3 className="text-base-content sticky left-0 text-sm font-semibold">
              Round {round}
            </h3>

            {(() => {
              const poolGroups = new Map<string, MatchSlot[]>();
              for (const m of roundMatchList) {
                const list = poolGroups.get(m.poolLabel) ?? [];
                list.push(m);
                poolGroups.set(m.poolLabel, list);
              }

              return Array.from(poolGroups.entries()).map(
                ([poolLabel, poolMatchList]) => (
                  <div key={poolLabel} className="flex flex-col gap-2">
                    <p className="text-base-content/50 text-[10px] font-medium tracking-wider uppercase md:text-xs">
                      {poolLabel}
                    </p>
                    {poolMatchList.map((m) => {
                      const ms = scores[m.id] ?? [0, 0];
                      const bothFilled =
                        m.completed ||
                        (isResolved(m.player1_id) && isResolved(m.player2_id));

                      if (!m.player2_id) {
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "rounded-box border p-3",
                              m.completed
                                ? "bg-base-200 border-green-500/40"
                                : "bg-base-200/50 border-base-content/20 border-dashed",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-xs",
                                  m.completed
                                    ? "font-semibold"
                                    : "text-base-content/50 font-medium",
                                )}
                              >
                                {getPlayerName(m.player1_id)}
                                {m.completed && !m.placeLabel && (
                                  <span className="text-base-content/50 ml-1">
                                    (bye)
                                  </span>
                                )}
                              </span>
                              {m.placeLabel && (
                                <span className="text-base-content/50 text-[10px]">
                                  {m.placeLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "bg-base-200 rounded-box flex min-w-[180px] flex-col gap-2 border p-3",
                            m.completed
                              ? "border-green-500/40"
                              : "border-[#712BB2]/30",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-xs",
                                m.completed && ms[0] > ms[1]
                                  ? "font-semibold"
                                  : "text-base-content/70 font-medium",
                              )}
                            >
                              {getPlayerName(m.player1_id)}
                            </span>
                            {m.completed ? (
                              <span className="shrink-0 text-xs tabular-nums">
                                {m.score_player1}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={ms[0]}
                                disabled={!bothFilled}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  handleScoreChange(m.id, 1, e.target.value)
                                }
                                className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-xs",
                                m.completed && ms[1] > ms[0]
                                  ? "font-semibold"
                                  : "text-base-content/70 font-medium",
                              )}
                            >
                              {getPlayerName(m.player2_id)}
                            </span>
                            {m.completed ? (
                              <span className="shrink-0 text-xs tabular-nums">
                                {m.score_player2}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={ms[1]}
                                disabled={!bothFilled}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  handleScoreChange(m.id, 2, e.target.value)
                                }
                                className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
                              />
                            )}
                          </div>

                          {!m.completed && bothFilled && (
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10"
                                onClick={() => handleComplete(m.id)}
                              >
                                Complete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ),
              );
            })()}
          </div>
        ))}
      </div>

      {matches.filter((m) => m.isPlacement).length > 0 && (
        <div className="mt-4">
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Final placements
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {matches
              .filter((m) => m.isPlacement)
              .sort((a, b) => {
                const pa = a.placeLabel ? parseInt(a.placeLabel) : 999;
                const pb = b.placeLabel ? parseInt(b.placeLabel) : 999;
                return pa - pb;
              })
              .map((m) => (
                <div
                  key={m.id}
                  className="bg-base-200 rounded-box flex items-center justify-between border border-green-500/40 p-3"
                >
                  <span className="text-xs font-semibold">
                    {getPlayerName(m.player1_id)}
                  </span>
                  <span className="text-base-content/50 text-[10px]">
                    {m.placeLabel ?? "Last place"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
