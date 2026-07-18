export type Player = { name: string; id: string };

export type GameData = {
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

export type Bracket = "winners" | "consolation" | "placement";

export type MatchSlot = {
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
  rankStart: number;
  rankEnd: number;
};

export type PlayerStats = {
  id: string;
  name: string;
  wins: number;
  played: number;
};

export function computeStats(
  players: Player[],
  games: GameData[],
): PlayerStats[] {
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

export function getWinner(
  scores: [number, number],
  p1: string,
  p2: string,
): { winner: string; loser: string } {
  return scores[0] > scores[1]
    ? { winner: p1, loser: p2 }
    : { winner: p2, loser: p1 };
}

function placeToOrdinal(place: number): string {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function ordinalPlace(label: string): number {
  const s = label.replace(/\D/g, "");
  return s ? Number(s) : 0;
}

export function buildBracketMatches(seeded: Player[]) {
  const N = seeded.length;
  const newMatches: MatchSlot[] = [];
  const newScores: Record<string, [number, number]> = {};
  const numMatches = Math.floor(N / 2);
  for (let i = 0; i < numMatches; i++) {
    const j = N - 1 - i;
    const id = `r1_m${i}`;
    newMatches.push({
      id,
      round: 1,
      bracket: "winners",
      player1_id: seeded[i]!.id,
      player2_id: seeded[j]!.id,
      score_player1: 0,
      score_player2: 0,
      completed: false,
      rankStart: 1,
      rankEnd: N,
    });
    newScores[id] = [0, 0];
  }
  if (N % 2 === 1) {
    const byeIdx = numMatches;
    const id = `r1_bye`;
    newMatches.push({
      id,
      round: 1,
      bracket: "winners",
      player1_id: seeded[byeIdx]!.id,
      player2_id: null,
      score_player1: 0,
      score_player2: 0,
      completed: true,
      rankStart: 1,
      rankEnd: N,
    });
    newScores[id] = [0, 0];
  }
  return { matches: newMatches, scores: newScores };
}

export function tryAdvance(
  currentMatches: MatchSlot[],
  currentScores: Record<string, [number, number]>,
): { matches: MatchSlot[]; scores: Record<string, [number, number]> } | null {
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
  if (currentMatches.some((m) => m.round === nextRound)) return null;

  const roundMatches = currentMatches.filter(
    (m) => m.round === maxCompleteRound && m.bracket !== "placement",
  );

  const groups = new Map<number, MatchSlot[]>();
  for (const m of roundMatches) {
    const key = m.rankStart;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const newMatches: MatchSlot[] = [];
  const newScores: Record<string, [number, number]> = {};
  let idx = currentMatches.length;

  for (const [, groupMatches] of groups) {
    const rStart = groupMatches[0]!.rankStart;
    const rEnd = groupMatches[0]!.rankEnd;
    const N = rEnd - rStart + 1;
    const numUpper = Math.ceil(N / 2);
    const midRank = rStart + numUpper - 1;

    const winners: string[] = [];
    const losers: string[] = [];
    for (const m of groupMatches) {
      if (!m.player2_id) {
        winners.push(m.player1_id!);
      } else {
        const sc = currentScores[m.id] ?? [m.score_player1, m.score_player2];
        const { winner, loser } = getWinner(sc, m.player1_id!, m.player2_id!);
        winners.push(winner);
        losers.push(loser);
      }
    }

    if (winners.length > 1) {
      const wN = winners.length;
      const wMatches = Math.floor(wN / 2);
      for (let i = 0; i < wMatches; i++) {
        const j = wN - 1 - i;
        idx++;
        const id = `r${nextRound}_w${idx}`;
        newMatches.push({
          id,
          round: nextRound,
          bracket: "winners",
          player1_id: winners[i]!,
          player2_id: winners[j]!,
          score_player1: 0,
          score_player2: 0,
          completed: false,
          rankStart: rStart,
          rankEnd: midRank,
        });
        newScores[id] = [0, 0];
      }
      if (wN % 2 === 1) {
        const byeIdx = wMatches;
        idx++;
        const id = `r${nextRound}_wbye${idx}`;
        newMatches.push({
          id,
          round: nextRound,
          bracket: "winners",
          player1_id: winners[byeIdx]!,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
          rankStart: rStart,
          rankEnd: midRank,
        });
        newScores[id] = [0, 0];
      }
    } else if (winners.length === 1) {
      const place = Math.floor((rStart + midRank) / 2);
      idx++;
      const id = `placement_${place}`;
      newMatches.push({
        id,
        round: nextRound,
        bracket: "placement",
        player1_id: winners[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: `${placeToOrdinal(place)} place`,
        rankStart: rStart,
        rankEnd: midRank,
      });
      newScores[id] = [0, 0];
    }

    if (losers.length > 1) {
      const lN = losers.length;
      const lMatches = Math.floor(lN / 2);
      for (let i = 0; i < lMatches; i++) {
        const j = lN - 1 - i;
        idx++;
        const id = `r${nextRound}_l${idx}`;
        newMatches.push({
          id,
          round: nextRound,
          bracket: "consolation",
          player1_id: losers[i]!,
          player2_id: losers[j]!,
          score_player1: 0,
          score_player2: 0,
          completed: false,
          rankStart: midRank + 1,
          rankEnd: rEnd,
        });
        newScores[id] = [0, 0];
      }
      if (lN % 2 === 1) {
        const byeIdx = lMatches;
        idx++;
        const id = `r${nextRound}_lbye${idx}`;
        newMatches.push({
          id,
          round: nextRound,
          bracket: "consolation",
          player1_id: losers[byeIdx]!,
          player2_id: null,
          score_player1: 0,
          score_player2: 0,
          completed: true,
          rankStart: midRank + 1,
          rankEnd: rEnd,
        });
        newScores[id] = [0, 0];
      }
    } else if (losers.length === 1) {
      const place = Math.floor((midRank + 1 + rEnd) / 2);
      idx++;
      const id = `placement_${place}`;
      newMatches.push({
        id,
        round: nextRound,
        bracket: "placement",
        player1_id: losers[0]!,
        player2_id: null,
        score_player1: 0,
        score_player2: 0,
        completed: true,
        placeLabel: `${placeToOrdinal(place)} place`,
        rankStart: midRank + 1,
        rankEnd: rEnd,
      });
      newScores[id] = [0, 0];
    }
  }

  if (newMatches.length === 0) return null;

  return {
    matches: [...currentMatches, ...newMatches],
    scores: { ...currentScores, ...newScores },
  };
}

export function reconstructBracket(
  seeded: Player[],
  games: GameData[],
): { matches: MatchSlot[]; scores: Record<string, [number, number]> } {
  const { matches: initialMatches, scores: initialScores } =
    buildBracketMatches(seeded);

  let currentMatches = initialMatches;
  let currentScores = initialScores;

  const sortedGames = [...games].sort((a, b) =>
    a.game_id.localeCompare(b.game_id),
  );

  for (const game of sortedGames) {
    const p1 = game.player1.innohassle_id;
    const p2 = game.player2.innohassle_id;
    const finished =
      game.finished || game.player1.score > 0 || game.player2.score > 0;
    if (!finished) continue;

    const match = currentMatches.find(
      (m) =>
        !m.completed &&
        m.bracket !== "placement" &&
        ((m.player1_id === p1 && m.player2_id === p2) ||
          (m.player1_id === p2 && m.player2_id === p1)),
    );
    if (!match) continue;

    const swapped = match.player1_id !== p1;

    const updated = currentMatches.map((m) =>
      m.id === match.id
        ? {
            ...m,
            game_id: game.game_id,
            score_player1: swapped ? game.player2.score : game.player1.score,
            score_player2: swapped ? game.player1.score : game.player2.score,
            completed: true,
          }
        : m,
    );

    const newScores = {
      ...currentScores,
      [match.id]: swapped
        ? ([game.player2.score, game.player1.score] as [number, number])
        : ([game.player1.score, game.player2.score] as [number, number]),
    };

    currentMatches = updated;
    currentScores = newScores;

    const advanced = tryAdvance(updated, newScores);
    if (advanced) {
      currentMatches = advanced.matches;
      currentScores = advanced.scores;
    }
  }

  return { matches: currentMatches, scores: currentScores };
}

export { ordinalPlace };
