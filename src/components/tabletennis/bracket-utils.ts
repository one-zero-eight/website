export type Player = { name: string; id: string; rating?: number };

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

export type Groups = Record<string, string[]>;

export function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Compares two {place: playerId} standings regardless of key order */
export function topsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => b[k] === a[k]);
}

export function standingsToTop(
  places: { place: number; id: string }[],
): Record<string, string> {
  return Object.fromEntries(places.map((p) => [String(p.place), p.id]));
}

export function groupName(index: number): string {
  return String.fromCharCode(65 + index);
}

// ── groups ────────────────────────────────────────────────────

/** Snake distribution by rating: A B C C B A A B C ... */
export function snakeGroups(players: Player[], groupCount: number): Groups {
  const count = Math.max(1, Math.min(groupCount, players.length));
  const groups: Groups = {};
  for (let i = 0; i < count; i++) groups[groupName(i)] = [];
  const sorted = [...players].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name),
  );
  sorted.forEach((p, i) => {
    const cycle = Math.floor(i / count);
    const pos = i % count;
    const idx = cycle % 2 === 0 ? pos : count - 1 - pos;
    groups[groupName(idx)]!.push(p.id);
  });
  return groups;
}

export type GroupStanding = {
  id: string;
  group: string;
  place: number;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  /** ITTF: 2 points for a win, 1 point for a loss */
  points: number;
};

type FinishedGame = { p1: string; p2: string; s1: number; s2: number };

function finishedGames(games: GameData[]): FinishedGame[] {
  return games
    .filter((g) => g.finished)
    .map((g) => ({
      p1: g.player1.innohassle_id,
      p2: g.player2.innohassle_id,
      s1: g.player1.score,
      s2: g.player2.score,
    }));
}

function tally(ids: string[], games: FinishedGame[]) {
  const inSet = new Set(ids);
  const stats = new Map(
    ids.map((id) => [
      id,
      { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, points: 0 },
    ]),
  );
  for (const g of games) {
    if (!inSet.has(g.p1) || !inSet.has(g.p2)) continue;
    const a = stats.get(g.p1)!;
    const b = stats.get(g.p2)!;
    a.played++;
    b.played++;
    a.setsWon += g.s1;
    a.setsLost += g.s2;
    b.setsWon += g.s2;
    b.setsLost += g.s1;
    if (g.s1 > g.s2) {
      a.wins++;
      a.points += 2;
      b.losses++;
      b.points += 1;
    } else {
      b.wins++;
      b.points += 2;
      a.losses++;
      a.points += 1;
    }
  }
  return stats;
}

function setRatio(won: number, lost: number) {
  if (lost === 0) return won === 0 ? 0 : Infinity;
  return won / lost;
}

/**
 * Orders players of one group by ITTF rules: points; ties are broken by
 * points in games between the tied players, then set ratio in those games,
 * then overall set ratio.
 */
export function groupStandings(
  group: string,
  ids: string[],
  games: GameData[],
  names: Map<string, string> = new Map(),
): GroupStanding[] {
  const fin = finishedGames(games);
  const overall = tally(ids, fin);

  const byPoints = new Map<number, string[]>();
  for (const id of ids) {
    const pts = overall.get(id)!.points;
    if (!byPoints.has(pts)) byPoints.set(pts, []);
    byPoints.get(pts)!.push(id);
  }

  const ordered: string[] = [];
  for (const pts of [...byPoints.keys()].sort((a, b) => b - a)) {
    const tied = byPoints.get(pts)!;
    if (tied.length === 1) {
      ordered.push(tied[0]!);
      continue;
    }
    const mini = tally(tied, fin);
    tied.sort((a, b) => {
      const ma = mini.get(a)!;
      const mb = mini.get(b)!;
      const oa = overall.get(a)!;
      const ob = overall.get(b)!;
      return (
        mb.points - ma.points ||
        setRatio(mb.setsWon, mb.setsLost) - setRatio(ma.setsWon, ma.setsLost) ||
        setRatio(ob.setsWon, ob.setsLost) - setRatio(oa.setsWon, oa.setsLost) ||
        ob.setsWon - ob.setsLost - (oa.setsWon - oa.setsLost) ||
        (names.get(a) ?? a).localeCompare(names.get(b) ?? b)
      );
    });
    // Infinity - Infinity is NaN; fall back to name order for those pairs
    ordered.push(...tied);
  }

  return ordered.map((id, i) => ({
    id,
    group,
    place: i + 1,
    ...overall.get(id)!,
  }));
}

export function groupGamesTotal(size: number) {
  return (size * (size - 1)) / 2;
}

// ── seeding ───────────────────────────────────────────────────

export type SeedEntry = {
  id: string;
  seed: number;
  group: string | null;
  groupPlace: number | null;
  points: number;
  played: number;
  setsWon: number;
  setsLost: number;
};

export type MatchSuggestion = {
  group: string;
  p1: string;
  p2: string;
  /** games of this group that have not been started yet */
  remaining: number;
};

/**
 * Suggests which group games to start next: the groups with the most games still
 * to start go first, and inside a group the pair of free players who have played
 * the fewest games and have been waiting the longest. At most one per group.
 */
export function suggestNextMatches(
  groups: Groups,
  games: GameData[],
  limit = 3,
): MatchSuggestion[] {
  const busy = new Set<string>();
  const played = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  const started = new Set<string>();

  games.forEach((g, index) => {
    const a = g.player1.innohassle_id;
    const b = g.player2.innohassle_id;
    started.add(pairKey(a, b));
    lastSeen.set(a, index);
    lastSeen.set(b, index);
    if (g.finished) {
      played.set(a, (played.get(a) ?? 0) + 1);
      played.set(b, (played.get(b) ?? 0) + 1);
    } else {
      busy.add(a);
      busy.add(b);
    }
  });

  const candidates = Object.entries(groups)
    .map(([group, members]) => {
      const pairs: [string, string][] = [];
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          if (!started.has(pairKey(members[i]!, members[j]!))) {
            pairs.push([members[i]!, members[j]!]);
          }
        }
      }
      return { group, pairs };
    })
    .filter((c) => c.pairs.length > 0)
    .sort(
      (a, b) =>
        b.pairs.length - a.pairs.length || a.group.localeCompare(b.group),
    );

  const cost = ([a, b]: [string, string]) => ({
    played: (played.get(a) ?? 0) + (played.get(b) ?? 0),
    recent: Math.max(lastSeen.get(a) ?? -1, lastSeen.get(b) ?? -1),
  });

  const result: MatchSuggestion[] = [];
  for (const { group, pairs } of candidates) {
    if (result.length >= limit) break;
    const free = pairs
      .filter(([a, b]) => !busy.has(a) && !busy.has(b))
      .sort((x, y) => {
        const cx = cost(x);
        const cy = cost(y);
        return cx.played - cy.played || cx.recent - cy.recent;
      });
    const best = free[0];
    if (!best) continue;
    busy.add(best[0]);
    busy.add(best[1]);
    result.push({ group, p1: best[0], p2: best[1], remaining: pairs.length });
  }
  return result;
}

/**
 * Everyone goes to qualification. Seeds: all group winners first, then all
 * second places, and so on. Inside one tier the better record goes first.
 * Then first-round opponents from the same group are swapped apart where possible.
 */
export function buildSeeding(
  players: Player[],
  groups: Groups,
  games: GameData[],
): SeedEntry[] {
  const names = new Map(players.map((p) => [p.id, p.name]));
  const groupEntries = Object.entries(groups).filter(([, m]) => m.length > 0);
  const effective: [string | null, string[]][] =
    groupEntries.length > 0 ? groupEntries : [[null, players.map((p) => p.id)]];

  const standings = effective.flatMap(([name, ids]) =>
    groupStandings(name ?? "", ids, games, names).map((s) => ({
      ...s,
      group: name,
    })),
  );

  const grouped = new Set(standings.map((s) => s.id));
  const leftovers = players
    .filter((p) => !grouped.has(p.id))
    .map((p) => ({
      id: p.id,
      group: null,
      place: Infinity,
      points: 0,
      played: 0,
      setsWon: 0,
      setsLost: 0,
    }));

  const perGame = (v: number, played: number) => (played ? v / played : 0);
  const ordered = [...standings, ...leftovers].sort(
    (a, b) =>
      a.place - b.place ||
      perGame(b.points, b.played) - perGame(a.points, a.played) ||
      perGame(b.setsWon - b.setsLost, b.played) -
        perGame(a.setsWon - a.setsLost, a.played) ||
      (names.get(a.id) ?? a.id).localeCompare(names.get(b.id) ?? b.id),
  );

  const seeds: SeedEntry[] = ordered.map((s, i) => ({
    id: s.id,
    seed: i + 1,
    group: s.group,
    groupPlace: Number.isFinite(s.place) ? s.place : null,
    points: s.points,
    played: s.played,
    setsWon: s.setsWon,
    setsLost: s.setsLost,
  }));

  return separateSameGroup(seeds);
}

function separateSameGroup(seeds: SeedEntry[]): SeedEntry[] {
  const n = seeds.length;
  if (n < 3) return seeds;
  const order = seedOrder(bracketSize(n));
  const list = [...seeds];
  // first-round opponent of seed s (1-based) is order[pos ^ 1]
  const posOf = new Map(order.map((s, pos) => [s, pos]));
  const opponent = (seed: number) => order[posOf.get(seed)! ^ 1]!;
  const conflict = (seed: number) => {
    const opp = opponent(seed);
    if (opp > n) return false;
    const a = list[seed - 1]!;
    const b = list[opp - 1]!;
    return a.group !== null && a.group === b.group;
  };

  for (let seed = n; seed >= 1; seed--) {
    if (!conflict(seed)) continue;
    const me = list[seed - 1]!;
    // swap with another seed of the same group place so the tier stays fair
    for (let other = n; other >= 1; other--) {
      if (other === seed) continue;
      const cand = list[other - 1]!;
      if (cand.groupPlace !== me.groupPlace) continue;
      if (other === opponent(seed)) continue;
      [list[seed - 1], list[other - 1]] = [cand, me];
      if (!conflict(seed) && !conflict(other)) break;
      [list[seed - 1], list[other - 1]] = [me, cand];
    }
  }
  return list.map((s, i) => ({ ...s, seed: i + 1 }));
}

// ── bracket ──────────────────────────────────────────────────

export function bracketSize(n: number) {
  let s = 1;
  while (s < n) s *= 2;
  return Math.max(2, s);
}

/** Standard seed positions: 1 v 8, 4 v 5, 2 v 7, 3 v 6 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap((s) => [s, len + 1 - s]);
  }
  return order;
}

export type Source =
  | { kind: "seed"; seed: number }
  | { kind: "winner" | "loser"; matchId: string };

export type Side =
  | { kind: "player"; id: string }
  | { kind: "bye" }
  | { kind: "tbd" };

export type MatchStatus = "waiting" | "ready" | "done" | "bye";

export type BracketMatch = {
  id: string;
  sectionId: string;
  round: number;
  index: number;
  sources: [Source, Source];
  side1: Side;
  side2: Side;
  status: MatchStatus;
  score1: number;
  score2: number;
  game_id?: string;
  winner: Side;
  loser: Side;
};

export type BracketSection = {
  id: string;
  /** best place decided in this section */
  placeFrom: number;
  /** worst place decided in this section */
  placeTo: number;
  rounds: number;
  matchIds: string[][];
};

export type Placement = { rawPlace: number; source: Source };

export type BracketStructure = {
  size: number;
  sections: BracketSection[];
  matches: Omit<
    BracketMatch,
    "side1" | "side2" | "status" | "score1" | "score2" | "winner" | "loser"
  >[];
  placements: Placement[];
};

/**
 * Full placement bracket: every player gets a place. Winners continue in the
 * section, losers of each round form a new section for the lower places.
 */
export function buildStructure(playerCount: number): BracketStructure {
  const size = bracketSize(playerCount);
  const sections: BracketSection[] = [];
  const matches: BracketStructure["matches"] = [];
  const placements: Placement[] = [];

  function build(entrants: Source[], placeFrom: number) {
    if (entrants.length === 1) {
      placements.push({ rawPlace: placeFrom, source: entrants[0]! });
      return;
    }
    const id = `s${placeFrom}`;
    const section: BracketSection = {
      id,
      placeFrom,
      placeTo: placeFrom + entrants.length - 1,
      rounds: Math.log2(entrants.length),
      matchIds: [],
    };
    sections.push(section);

    const pendingLosers: [Source[], number][] = [];
    let current = entrants;
    let round = 0;
    while (current.length > 1) {
      const winners: Source[] = [];
      const losers: Source[] = [];
      const ids: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const matchId = `${id}_r${round}_m${i / 2}`;
        matches.push({
          id: matchId,
          sectionId: id,
          round,
          index: i / 2,
          sources: [current[i]!, current[i + 1]!],
        });
        ids.push(matchId);
        winners.push({ kind: "winner", matchId });
        losers.push({ kind: "loser", matchId });
      }
      section.matchIds.push(ids);
      pendingLosers.push([losers, placeFrom + winners.length]);
      current = winners;
      round++;
    }
    placements.push({ rawPlace: placeFrom, source: current[0]! });

    // later rounds decide better places, build them first so tabs go top-down
    for (const [losers, from] of pendingLosers.reverse()) {
      build(losers, from);
    }
  }

  build(
    seedOrder(size).map((seed) => ({ kind: "seed", seed })),
    1,
  );

  sections.sort((a, b) => a.placeFrom - b.placeFrom);
  placements.sort((a, b) => a.rawPlace - b.rawPlace);
  return { size, sections, matches, placements };
}

export type ResolvedBracket = {
  sections: BracketSection[];
  matches: Map<string, BracketMatch>;
  /** players with their final place, compressed to 1..N (byes removed) */
  places: { place: number; id: string }[];
  complete: boolean;
};

export function resolveBracket(
  seeding: string[],
  games: GameData[],
): ResolvedBracket {
  const n = seeding.length;
  const structure = buildStructure(n);
  const resolved = new Map<string, BracketMatch>();

  const gamesByPair = new Map<string, GameData[]>();
  for (const g of games) {
    const key = pairKey(g.player1.innohassle_id, g.player2.innohassle_id);
    if (!gamesByPair.has(key)) gamesByPair.set(key, []);
    gamesByPair.get(key)!.push(g);
  }

  function side(src: Source): Side {
    if (src.kind === "seed") {
      return src.seed <= n
        ? { kind: "player", id: seeding[src.seed - 1]! }
        : { kind: "bye" };
    }
    const m = resolved.get(src.matchId)!;
    return src.kind === "winner" ? m.winner : m.loser;
  }

  for (const base of structure.matches) {
    const side1 = side(base.sources[0]);
    const side2 = side(base.sources[1]);
    const match: BracketMatch = {
      ...base,
      side1,
      side2,
      status: "waiting",
      score1: 0,
      score2: 0,
      winner: { kind: "tbd" },
      loser: { kind: "tbd" },
    };

    if (side1.kind === "bye" || side2.kind === "bye") {
      match.status = "bye";
      if (side1.kind === "bye" && side2.kind === "bye") {
        match.winner = { kind: "bye" };
        match.loser = { kind: "bye" };
      } else {
        match.winner = side1.kind === "bye" ? side2 : side1;
        match.loser = { kind: "bye" };
      }
    } else if (side1.kind === "player" && side2.kind === "player") {
      const candidates = gamesByPair.get(pairKey(side1.id, side2.id)) ?? [];
      const finished = candidates.find((g) => g.finished);
      const open = candidates.find((g) => !g.finished);
      if (finished) {
        const swapped = finished.player1.innohassle_id !== side1.id;
        match.score1 = swapped
          ? finished.player2.score
          : finished.player1.score;
        match.score2 = swapped
          ? finished.player1.score
          : finished.player2.score;
        match.game_id = finished.game_id;
        match.status = "done";
        const firstWon = match.score1 > match.score2;
        match.winner = firstWon ? side1 : side2;
        match.loser = firstWon ? side2 : side1;
      } else {
        match.status = "ready";
        match.game_id = open?.game_id;
      }
    }

    resolved.set(match.id, match);
  }

  const raw = structure.placements.map((p) => ({
    rawPlace: p.rawPlace,
    side: side(p.source),
  }));
  const players = raw.filter(
    (r): r is { rawPlace: number; side: { kind: "player"; id: string } } =>
      r.side.kind === "player",
  );
  const byeRawPlaces = raw
    .filter((r) => r.side.kind === "bye")
    .map((r) => r.rawPlace);
  const places = players.map((r) => ({
    id: r.side.id,
    place: r.rawPlace - byeRawPlaces.filter((b) => b < r.rawPlace).length,
  }));

  return {
    sections: structure.sections,
    matches: resolved,
    places,
    complete: places.length === n,
  };
}

/** Sections that contain at least one real (non-bye) match, labelled with real places */
export function visibleSections(bracket: ResolvedBracket, playerCount: number) {
  return bracket.sections
    .filter((s) =>
      s.matchIds.flat().some((id) => bracket.matches.get(id)!.status !== "bye"),
    )
    .map((s) => ({
      ...s,
      labelFrom: Math.min(s.placeFrom, playerCount),
      labelTo: Math.min(s.placeTo, playerCount),
    }));
}

export function roundLabel(
  section: BracketSection,
  round: number,
  hasByes = false,
): string {
  const left = section.rounds - round;
  // a first round padded with byes is not a real 1/8 or 1/4
  if (round === 0 && hasByes && left > 1) return "Round 1";
  if (left === 1) {
    return section.placeFrom === 1
      ? "Final"
      : `${ordinal(section.placeFrom)} place`;
  }
  return `1/${2 ** (left - 1)}`;
}
