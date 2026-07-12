import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";

type Player = { name: string; id: string };

type GamePlayer = {
  innohassle_id: string;
  nickname: string;
  rating: number;
  registered: boolean;
  score: number;
};

type GameData = {
  game_id: string;
  tour_id: string;
  tournament_name: string;
  finished: boolean;
  player1: GamePlayer;
  player2: GamePlayer;
};

type MatchSlot = {
  id: string;
  game_id?: string;
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

function matchKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

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
  tourId,
  qualificationGames,
}: {
  players: Player[];
  validationStats?: { playerId: string; wins: number; played: number }[];
  tourId: string;
  qualificationGames: GameData[];
}) {
  const { showError } = useToast();

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
  const [seeded, setSeeded] = useState<Player[]>([]);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);

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
  const startedRef = useRef(started);
  startedRef.current = started;

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

  useEffect(() => {
    if (
      !started &&
      !starting &&
      seeded.length > 0 &&
      qualificationGames.length > 0
    ) {
      const ids = seeded.map((p) => p.id);
      const gameByPair = new Map<string, GameData>();
      for (const g of qualificationGames) {
        gameByPair.set(
          matchKey(g.player1.innohassle_id, g.player2.innohassle_id),
          g,
        );
      }

      setStarted(true);
      setCurrentRound(1);
      setMatches([]);
      setScores({});
      setEliminated([]);

      const { newMatches, newScores } = createMatchSlots(
        ids,
        [],
        1,
        [],
        gameByPair,
      );
      const allMatches = [...newMatches];
      setMatches(allMatches);
      setScores(newScores);

      setTimeout(
        () => advanceRestoreRound(allMatches, ids, [], 1, [], gameByPair),
        0,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded, qualificationGames, started, starting]);

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

  function createMatchSlots(
    winners: string[],
    consolation: string[],
    round: number,
    currentMatches: MatchSlot[],
    gameByPair: Map<string, GameData>,
  ): { newMatches: MatchSlot[]; newScores: Record<string, [number, number]> } {
    const newMatches: MatchSlot[] = [];
    const newScores: Record<string, [number, number]> = {};
    let idx = currentMatches.length;

    if (winners.length > 1) {
      const wSorted = sortBySeed(winners, seedOrder);
      const pairs = pairFromSeed(wSorted);
      for (const [p1, p2] of pairs) {
        idx++;
        const id = `r${round}_m${idx}`;
        const key = matchKey(p1, p2);
        const game = gameByPair.get(key);
        newMatches.push({
          id,
          game_id: game?.game_id,
          round,
          poolLabel: "Winners",
          player1_id: p1,
          player2_id: p2,
          score_player1: game?.player1?.score ?? 0,
          score_player2: game?.player2?.score ?? 0,
          completed: game
            ? (game.finished ?? false) ||
              (game.player1.score ?? 0) > 0 ||
              (game.player2.score ?? 0) > 0
            : false,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[id] = [game?.player1?.score ?? 0, game?.player2?.score ?? 0];
      }
      if (wSorted.length % 2 !== 0) {
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
    } else if (
      winners.length === 1 &&
      !currentMatches.some((m) => m.poolLabel === "Champion")
    ) {
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
      for (const [p1, p2] of pairs) {
        idx++;
        const id = `r${round}_m${idx}`;
        const key = matchKey(p1, p2);
        const game = gameByPair.get(key);
        newMatches.push({
          id,
          game_id: game?.game_id,
          round,
          poolLabel: "Consolation",
          player1_id: p1,
          player2_id: p2,
          score_player1: game?.player1?.score ?? 0,
          score_player2: game?.player2?.score ?? 0,
          completed: game
            ? (game.finished ?? false) ||
              (game.player1.score ?? 0) > 0 ||
              (game.player2.score ?? 0) > 0
            : false,
          isPlacement: false,
          placeLabel: null,
        });
        newScores[id] = [game?.player1?.score ?? 0, game?.player2?.score ?? 0];
      }
      if (cSorted.length % 2 !== 0) {
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

    // Compute placements if tournament is done
    const championExists = currentMatches.some(
      (m) => m.poolLabel === "Champion",
    );
    const creatingChampion = newMatches.some((m) => m.poolLabel === "Champion");
    const hasChampion = championExists || creatingChampion;
    const tournamentDone =
      winners.length <= 1 && consolation.length <= 1 && hasChampion;
    if (
      tournamentDone &&
      !currentMatches.some((m) => m.poolLabel === "Final placement")
    ) {
      const placementMatches = computePlacements(
        eliminatedRef.current,
        seeded,
        [...currentMatches, ...newMatches],
      );
      newMatches.push(...placementMatches);
    }

    return { newMatches, newScores };
  }

  function advanceFromRound(
    roundMatches: MatchSlot[],
    round: number,
    eliminatedSoFar: EliminatedPlayer[],
  ): {
    nextWinners: string[];
    nextConsolation: string[];
    newEliminated: EliminatedPlayer[];
  } | null {
    const allDone = roundMatches.every((m) => m.completed);
    if (!allDone) return null;

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
        const sc: [number, number] = [m.score_player1, m.score_player2];
        const [winner, loser] = getWinner(sc, m.player1_id!, m.player2_id!);
        wWinners.push(winner);
        wLosers.push(loser);
      }
    }

    for (const m of consolationMatches) {
      if (!m.player2_id) {
        cWinners.push(m.player1_id!);
      } else {
        const sc: [number, number] = [m.score_player1, m.score_player2];
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
    const combinedEliminated = [...eliminatedSoFar, ...newEliminated];

    const nextWinners = wWinners;
    const isFinalWinnersRound =
      wWinners.length === 1 &&
      wLosers.length === 1 &&
      winnersMatches.some((m) => m.player2_id);
    const nextConsolation = [
      ...(isFinalWinnersRound ? [] : wLosers),
      ...cWinners,
    ];

    return {
      nextWinners,
      nextConsolation,
      newEliminated: combinedEliminated,
    };
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

  async function handleStart() {
    const ids = seeded.map((p) => p.id);
    setStarting(true);
    setCurrentRound(1);
    setMatches([]);
    setScores({});
    setEliminated([]);
    setStarted(true);

    // Determine which games need to be created in backend
    const wSorted = sortBySeed(ids, seedOrder);
    const pairs = pairFromSeed(wSorted);
    const gameByPair = new Map<string, string>();
    const pairsToCreate = pairs.filter(([p1, p2]) => p1 && p2);
    await Promise.all(
      pairsToCreate.map(async ([p1, p2]) => {
        try {
          const result = await createGame({
            params: {
              query: {
                tour_id: tourId,
                tip: "cval" as const,
                player1_id: p1,
                player2_id: p2,
              },
            },
          } as any);
          const gid = (result as any)?.id ?? "";
          if (gid) gameByPair.set(matchKey(p1, p2), gid);
        } catch {
          // onError shows toast
        }
      }),
    );

    // Build match slots with game_ids from backend
    const { newMatches, newScores } = createMatchSlots(
      ids,
      [],
      1,
      [],
      new Map(),
    );
    const matchesWithIds = newMatches.map((m) => {
      if (m.player1_id && m.player2_id && !m.game_id) {
        const gid = gameByPair.get(matchKey(m.player1_id, m.player2_id));
        return { ...m, game_id: gid ?? m.game_id };
      }
      return m;
    });

    setMatches(matchesWithIds);
    setScores(newScores);
    setStarting(false);
  }

  function advanceRestoreRound(
    currentMatches: MatchSlot[],
    winners: string[],
    consolation: string[],
    round: number,
    eliminatedSoFar: EliminatedPlayer[],
    gameByPair: Map<string, GameData>,
  ) {
    const roundMatches = currentMatches.filter((m) => m.round === round);
    if (roundMatches.length === 0) return;

    const result = advanceFromRound(roundMatches, round, eliminatedSoFar);
    if (!result) return;

    setEliminated(result.newEliminated);
    const nextRound = round + 1;
    setCurrentRound(nextRound);

    const { newMatches, newScores } = createMatchSlots(
      result.nextWinners,
      result.nextConsolation,
      nextRound,
      currentMatches,
      gameByPair,
    );

    if (newMatches.length > 0) {
      setMatches((prev) => [...prev, ...newMatches]);
      setScores((prev) => ({ ...prev, ...newScores }));

      setTimeout(
        () =>
          advanceRestoreRound(
            [...currentMatches, ...newMatches],
            result.nextWinners,
            result.nextConsolation,
            nextRound,
            result.newEliminated,
            gameByPair,
          ),
        0,
      );
    }
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

  async function handleComplete(matchId: string) {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.completed) return;
    setFinishingId(matchId);

    const ms = scoresRef.current[matchId] ?? [0, 0];

    // Finish game in backend
    if (match.game_id) {
      try {
        await finishGame({
          params: {
            query: {
              game_id: match.game_id,
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

    // Update match state
    const updated = matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            score_player1: ms[0],
            score_player2: ms[1],
            completed: true,
          }
        : m,
    );
    setMatches(updated);

    // Check for round advancement
    const round = currentRound;
    const roundMatches = updated.filter((m) => m.round === round);
    const result = advanceFromRound(roundMatches, round, eliminated);

    if (!result) {
      setFinishingId(null);
      return;
    }

    const nextRound = round + 1;
    setCurrentRound(nextRound);
    setEliminated(result.newEliminated);

    const { newMatches, newScores } = createMatchSlots(
      result.nextWinners,
      result.nextConsolation,
      nextRound,
      updated,
      new Map(),
    );

    if (newMatches.length > 0) {
      setMatches((prev) => [...prev, ...newMatches]);
      setScores((prev) => ({ ...prev, ...newScores }));
    }

    setFinishingId(null);
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
            className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-[#712BB2]/90 disabled:cursor-not-allowed disabled:opacity-40 md:px-8 md:py-3 md:text-sm"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Start qualification"
            )}
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
                                className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:opacity-40"
                                onClick={() => handleComplete(m.id)}
                                disabled={finishingId === m.id}
                              >
                                {finishingId === m.id ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  "Complete"
                                )}
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
