import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";

type Player = { name: string; id: string };

type GameData = {
  game_id: string;
  tour_id: string;
  tournament_name: string;
  finished: boolean;
  player1: {
    innohassle_id: string;
    nickname: string;
    rating: number;
    registered: boolean;
    score: number;
  };
  player2: {
    innohassle_id: string;
    nickname: string;
    rating: number;
    registered: boolean;
    score: number;
  };
};

type Bracket = "winners" | "consolation" | "placement";

type MatchSlot = {
  id: string;
  game_id?: string;
  round: number;
  bracket: Bracket;
  player1_id: string | null;
  player2_id: string | null;
  score_player1: number;
  score_player2: number;
  completed: boolean;
  placeLabel?: string | null;
};

type PlayerStats = {
  id: string;
  name: string;
  wins: number;
  played: number;
};

type BracketState = {
  matches: MatchSlot[];
  scores: Record<string, [number, number]>;
  seededIds: string[];
};

function localStorageKey(tourId: string) {
  return `tt-bracket-${tourId}`;
}

function computeStats(players: Player[], games: GameData[]): PlayerStats[] {
  const wins = new Map<string, number>();
  const played = new Map<string, number>();
  for (const p of players) {
    wins.set(p.id, 0);
    played.set(p.id, 0);
  }
  for (const g of games) {
    const p1 = g.player1.innohassle_id;
    const p2 = g.player2.innohassle_id;
    const s1 = g.player1.score;
    const s2 = g.player2.score;
    const finished = g.finished || s1 > 0 || s2 > 0;
    if (!finished) continue;
    played.set(p1, (played.get(p1) ?? 0) + 1);
    played.set(p2, (played.get(p2) ?? 0) + 1);
    if (s1 > s2) wins.set(p1, (wins.get(p1) ?? 0) + 1);
    else if (s2 > s1) wins.set(p2, (wins.get(p2) ?? 0) + 1);
  }
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      wins: wins.get(p.id) ?? 0,
      played: played.get(p.id) ?? 0,
    }))
    .sort((a, b) => {
      const rateA = a.played > 0 ? a.wins / a.played : 0;
      const rateB = b.played > 0 ? b.wins / b.played : 0;
      if (rateB !== rateA) return rateB - rateA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.played !== a.played) return b.played - a.played;
      return a.name.localeCompare(b.name);
    });
}

function getWinner(
  scores: [number, number],
  p1: string,
  p2: string,
): { winner: string; loser: string } {
  return scores[0] > scores[1]
    ? { winner: p1, loser: p2 }
    : { winner: p2, loser: p1 };
}

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

  // ── seeding from validation stats or valTop ─────────────────
  const rankedStats = useMemo(
    () => computeStats(players, validationGames),
    [players, validationGames],
  );

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
    return rankedStats.map((s) => ({ id: s.id, name: s.name }));
  }, [valTop, rankedStats, players]);

  const [seededPlayers, setSeededPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchSlot[]>([]);
  const [scores, setScores] = useState<Record<string, [number, number]>>({});
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [locked, setLocked] = useState(() => qualificationGames.length > 0);
  // keep scoresRef in sync
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // ── map from id → player name ──────────────────────────────
  const playerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.id, p.name);
    return m;
  }, [players]);

  function getPlayerName(id: string | null): string {
    if (!id) return "TBD";
    return playerMap.get(id) ?? id;
  }

  // ── load from localStorage and sync from backend ───────────
  useEffect(() => {
    if (seededPlayers.length > 0) return;
    if (initialSeeded.length === 0) return;
    setSeededPlayers(initialSeeded);

    const KEY = localStorageKey(tourId);
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BracketState;
        setMatches(parsed.matches);
        setScores(parsed.scores);
        setSeededPlayers(
          parsed.seededIds.length > 0
            ? parsed.seededIds
                .map((id) => players.find((p) => p.id === id))
                .filter((p): p is Player => !!p)
            : initialSeeded,
        );
        return;
      } catch {
        /* corrupted */
      }
    }

    // restore from backend qualification games
    if (qualificationGames.length > 0) {
      const restored: MatchSlot[] = [];
      const restoredScores: Record<string, [number, number]> = {};
      qualificationGames.forEach((g, i) => {
        const p1 = g.player1.innohassle_id;
        const p2 = g.player2.innohassle_id;
        const id = `r1_m${i}`;
        const finished =
          g.finished || g.player1.score > 0 || g.player2.score > 0;
        restored.push({
          id,
          game_id: g.game_id,
          round: 1,
          bracket: "winners",
          player1_id: p1,
          player2_id: p2,
          score_player1: g.player1.score,
          score_player2: g.player2.score,
          completed: finished,
        });
        restoredScores[id] = [g.player1.score, g.player2.score];
      });
      setMatches(restored);
      setScores(restoredScores);
      saveBracketState(restored, restoredScores, initialSeeded);
    }
  }, [tourId, initialSeeded, qualificationGames, players]);

  function saveBracketState(
    m: MatchSlot[],
    sc: Record<string, [number, number]>,
    seeded?: Player[],
  ) {
    const state: BracketState = {
      matches: m,
      scores: sc,
      seededIds: seeded
        ? seeded.map((p) => p.id)
        : seededPlayers.map((p) => p.id),
    };
    localStorage.setItem(localStorageKey(tourId), JSON.stringify(state));
  }

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

  // ── seeding reorder ────────────────────────────────────────
  function handleMoveUp(index: number) {
    if (index === 0) return;
    setSeededPlayers((prev) => {
      const next = [...prev];
      [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!];
      return next;
    });
  }

  function handleMoveDown(index: number) {
    if (index >= seededPlayers.length - 1) return;
    setSeededPlayers((prev) => {
      const next = [...prev];
      [next[index]!, next[index + 1]!] = [next[index + 1]!, next[index]!];
      return next;
    });
  }

  function buildBracketMatches(seeded: Player[]) {
    const newMatches: MatchSlot[] = [];
    const newScores: Record<string, [number, number]> = {};
    let i = 0;
    let j = seeded.length - 1;
    let matchIdx = 0;
    while (i <= j) {
      if (i === j) {
        const id = `r1_bye_${matchIdx}`;
        newMatches.push({
          id,
          round: 1,
          bracket: "winners",
          player1_id: seeded[i]!.id,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
        });
        newScores[id] = [0, 0];
        matchIdx++;
        break;
      }
      const id = `r1_m${matchIdx}`;
      newMatches.push({
        id,
        round: 1,
        bracket: "winners",
        player1_id: seeded[i]!.id,
        player2_id: seeded[j]!.id,
        score_player1: 0,
        score_player2: 0,
        completed: false,
      });
      newScores[id] = [0, 0];
      matchIdx++;
      i++;
      j--;
    }
    return { matches: newMatches, scores: newScores };
  }

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
    if (locked || seededPlayers.length < 2) return;
    setLocked(true);
    if (matches.length === 0) {
      const { matches: newMatches, scores: newScores } =
        buildBracketMatches(seededPlayers);
      setMatches(newMatches);
      setScores(newScores);
      saveBracketState(newMatches, newScores);
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
    saveBracketState(updated, newScores);
    setFinishingId(null);
    onTourRefetch?.();

    // try auto-advance
    const advanced = tryAdvance(updated, newScores);
    if (advanced) {
      setMatches(advanced.matches);
      setScores(advanced.scores);
      saveBracketState(advanced.matches, advanced.scores);
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

  // ── auto-advance logic ────────────────────────────────────
  function tryAdvance(
    currentMatches: MatchSlot[],
    currentScores: Record<string, [number, number]>,
  ): { matches: MatchSlot[]; scores: Record<string, [number, number]> } | null {
    // find the highest round where ALL non-placement matches are completed
    const allRounds = [...new Set(currentMatches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );
    let maxCompleteRound = -1;
    for (const round of allRounds) {
      const ms = currentMatches.filter(
        (m) => m.round === round && m.bracket !== "placement",
      );
      if (ms.length > 0 && ms.every((m) => m.completed)) {
        maxCompleteRound = round;
      } else break;
    }
    if (maxCompleteRound < 0) return null;

    const nextRound = maxCompleteRound + 1;
    // next round already exists — nothing to create
    if (currentMatches.some((m) => m.round === nextRound)) return null;

    const currentRound = maxCompleteRound;
    const roundMatches = currentMatches.filter(
      (m) => m.round === currentRound && m.bracket !== "placement",
    );

    // collect results
    const winnersWinners: string[] = [];
    const winnersLosers: string[] = [];
    const consWinners: string[] = [];
    const consLosers: string[] = [];

    for (const m of roundMatches) {
      if (m.bracket === "winners") {
        if (!m.player2_id) {
          winnersWinners.push(m.player1_id!);
        } else {
          const sc = currentScores[m.id] ?? [m.score_player1, m.score_player2];
          const { winner, loser } = getWinner(sc, m.player1_id!, m.player2_id!);
          winnersWinners.push(winner);
          winnersLosers.push(loser);
        }
      } else if (m.bracket === "consolation") {
        if (!m.player2_id) {
          consWinners.push(m.player1_id!);
        } else {
          const sc = currentScores[m.id] ?? [m.score_player1, m.score_player2];
          const { winner, loser } = getWinner(sc, m.player1_id!, m.player2_id!);
          consWinners.push(winner);
          consLosers.push(loser);
        }
      }
    }

    const hasResolved = currentMatches.some((m) => m.id === "placement_1st");

    const newMatches: MatchSlot[] = [];
    const newScores: Record<string, [number, number]> = {};
    let idx = currentMatches.length;

    // eliminated from consolation → placements (always run, even with existing placements)
    if (consLosers.length > 0) {
      const existingPlaces = currentMatches.filter(
        (m) => m.bracket === "placement" && m.completed,
      ).length;
      consLosers.forEach((playerId, i) => {
        const place = existingPlaces + i + 4; // start at 4th
        const ordinal = place === 4 ? "4th" : `${place}th`;
        idx++;
        const id = `placement_${place}`;
        newMatches.push({
          id,
          round: nextRound,
          bracket: "placement",
          player1_id: playerId,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
          placeLabel: `${ordinal} place`,
        });
        newScores[id] = [0, 0];
      });
    }

    // if champion already resolved, only add consolation loser placements and stop
    if (hasResolved) {
      if (newMatches.length === 0) return null;
      return {
        matches: [...currentMatches, ...newMatches],
        scores: { ...currentScores, ...newScores },
      };
    }

    const isFinalWinners =
      winnersWinners.length === 1 &&
      winnersLosers.length === 1 &&
      currentRound > 1;

    // winners bracket: winners go up
    if (winnersWinners.length > 1) {
      for (let i = 0; i < winnersWinners.length; i += 2) {
        if (i + 1 < winnersWinners.length) {
          idx++;
          const id = `r${nextRound}_w${idx}`;
          newMatches.push({
            id,
            round: nextRound,
            bracket: "winners",
            player1_id: winnersWinners[i]!,
            player2_id: winnersWinners[i + 1]!,
            score_player1: 0,
            score_player2: 0,
            completed: false,
          });
          newScores[id] = [0, 0];
        } else {
          idx++;
          const id = `r${nextRound}_wbye${idx}`;
          newMatches.push({
            id,
            round: nextRound,
            bracket: "winners",
            player1_id: winnersWinners[i]!,
            player2_id: null,
            score_player1: 0,
            score_player2: 0,
            completed: true,
          });
          newScores[id] = [0, 0];
        }
      }
    } else if (winnersWinners.length === 1 && currentRound > 0) {
      // champion
      idx++;
      const id = `placement_1st`;
      newMatches.push({
        id,
        round: nextRound,
        bracket: "placement",
        player1_id: winnersWinners[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: "1st place",
      });
      newScores[id] = [0, 0];
    }

    // consolation bracket: losers from winners + winners from consolation
    // unless it's the final winners round (then loser goes to 2nd)
    const nextConsPlayers = isFinalWinners
      ? consWinners
      : [...winnersLosers, ...consWinners];

    if (nextConsPlayers.length > 1) {
      for (let i = 0; i < nextConsPlayers.length; i += 2) {
        if (i + 1 < nextConsPlayers.length) {
          idx++;
          const id = `r${nextRound}_c${idx}`;
          newMatches.push({
            id,
            round: nextRound,
            bracket: "consolation",
            player1_id: nextConsPlayers[i]!,
            player2_id: nextConsPlayers[i + 1]!,
            score_player1: 0,
            score_player2: 0,
            completed: false,
          });
          newScores[id] = [0, 0];
        } else {
          idx++;
          const id = `r${nextRound}_cbye${idx}`;
          newMatches.push({
            id,
            round: nextRound,
            bracket: "consolation",
            player1_id: nextConsPlayers[i]!,
            player2_id: null,
            score_player1: 0,
            score_player2: 0,
            completed: true,
          });
          newScores[id] = [0, 0];
        }
      }
    } else if (nextConsPlayers.length === 1 && nextRound > 1) {
      idx++;
      const isSecond = !isFinalWinners && winnersWinners.length === 1;
      const label = isSecond ? "2nd place" : "3rd place";
      newMatches.push({
        id: `placement_3rd`,
        round: nextRound,
        bracket: "placement",
        player1_id: nextConsPlayers[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: label,
      });
      newScores[`placement_3rd`] = [0, 0];
    } else if (nextConsPlayers.length === 1 && nextRound <= 1) {
      idx++;
      newMatches.push({
        id: `placement_3rd`,
        round: nextRound,
        bracket: "placement",
        player1_id: nextConsPlayers[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: "3rd place",
      });
      newScores[`placement_3rd`] = [0, 0];
    }

    // 2nd place: if final winners round loser didn't go to consolation
    if (isFinalWinners && winnersLosers.length === 1) {
      idx++;
      newMatches.push({
        id: `placement_2nd`,
        round: nextRound,
        bracket: "placement",
        player1_id: winnersLosers[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: "2nd place",
      });
      newScores[`placement_2nd`] = [0, 0];
    }

    if (newMatches.length === 0) return null;

    return {
      matches: [...currentMatches, ...newMatches],
      scores: { ...currentScores, ...newScores },
    };
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
          {seededPlayers.map((p, i) => {
            const stats = rankedStats.find((s) => s.id === p.id);
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
                {!locked && (
                  <>
                    <button
                      type="button"
                      className="hover:text-base-content text-base-content/30 transition-colors disabled:opacity-10"
                      disabled={i === 0}
                      onClick={() => handleMoveUp(i)}
                    >
                      <span className="icon-[mdi--chevron-up] text-lg" />
                    </button>
                    <button
                      type="button"
                      className="hover:text-base-content text-base-content/30 transition-colors disabled:opacity-10"
                      disabled={i >= seededPlayers.length - 1}
                      onClick={() => handleMoveDown(i)}
                    >
                      <span className="icon-[mdi--chevron-down] text-lg" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {!locked && seededPlayers.length >= 2 && (
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
        seededPlayers.length < 2 && (
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
