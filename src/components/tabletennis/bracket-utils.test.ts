import { describe, expect, it } from "vitest";
import {
  buildSeeding,
  groupStandings,
  resolveBracket,
  seedOrder,
  snakeGroups,
  visibleSections,
  type GameData,
  type Player,
} from "./bracket-utils";

let gameCounter = 0;
function game(p1: string, p2: string, s1: number, s2: number): GameData {
  gameCounter++;
  return {
    game_id: `g${gameCounter}`,
    tour_id: "t",
    tournament_name: "t",
    finished: true,
    player1: {
      innohassle_id: p1,
      nickname: p1,
      rating: 0,
      registered: true,
      score: s1,
    },
    player2: {
      innohassle_id: p2,
      nickname: p2,
      rating: 0,
      registered: true,
      score: s2,
    },
  };
}

/** Plays every ready match, the lower seed index (earlier in seeding) wins 3:1 */
function playOut(seeding: string[]) {
  const games: GameData[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const bracket = resolveBracket(seeding, games);
    const ready = [...bracket.matches.values()].find(
      (m) => m.status === "ready",
    );
    if (!ready) return { bracket, games };
    if (ready.side1.kind !== "player" || ready.side2.kind !== "player")
      throw new Error();
    const a = ready.side1.id;
    const b = ready.side2.id;
    const aBetter = seeding.indexOf(a) < seeding.indexOf(b);
    games.push(game(a, b, aBetter ? 3 : 1, aBetter ? 1 : 3));
  }
  throw new Error("bracket never finished");
}

describe("seedOrder", () => {
  it("places top seeds apart", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe("resolveBracket", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16])(
    "gives every one of %i players a unique place 1..N",
    (n) => {
      const seeding = Array.from({ length: n }, (_, i) => `p${i + 1}`);
      const { bracket, games } = playOut(seeding);
      expect(bracket.complete).toBe(true);
      const places = [...bracket.places].sort((a, b) => a.place - b.place);
      expect(places.map((p) => p.place)).toEqual(
        Array.from({ length: n }, (_, i) => i + 1),
      );
      // the stronger seed always wins, so the result must equal the seeding
      expect(places.map((p) => p.id)).toEqual(seeding);
      // no pair ever meets twice
      const pairs = games.map((g) =>
        [g.player1.innohassle_id, g.player2.innohassle_id].sort().join(),
      );
      expect(new Set(pairs).size).toBe(pairs.length);
    },
  );

  it("makes a semi-final playable before the other quarter-final ends", () => {
    const seeding = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    // quarter-finals: 1v8, 4v5, 2v7, 3v6 — finish the first two only
    const games = [game("p1", "p8", 3, 0), game("p4", "p5", 3, 2)];
    const bracket = resolveBracket(seeding, games);
    const semi = bracket.matches.get("s1_r1_m0")!;
    expect(semi.status).toBe("ready");
    expect(semi.side1).toEqual({ kind: "player", id: "p1" });
    expect(semi.side2).toEqual({ kind: "player", id: "p4" });
    expect(bracket.matches.get("s1_r1_m1")!.status).toBe("waiting");
    // match for places 5-8 between the two losers is also ready
    expect(bracket.matches.get("s5_r0_m0")!.status).toBe("ready");
  });

  it("hides sections made only of byes", () => {
    const seeding = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
    const bracket = resolveBracket(seeding, []);
    const labels = visibleSections(bracket, 12).map(
      (s) => `${s.labelFrom}-${s.labelTo}`,
    );
    expect(labels).not.toContain("12-12");
    expect(labels[0]).toBe("1-12");
  });
});

describe("groupStandings", () => {
  it("uses points, then head-to-head for ties", () => {
    // a beats b, b beats c, c beats a: all 3 points; head-to-head equal, sets decide
    const games = [
      game("a", "b", 3, 0),
      game("b", "c", 3, 2),
      game("c", "a", 3, 2),
    ];
    const s = groupStandings("A", ["a", "b", "c"], games);
    expect(s.map((x) => x.points)).toEqual([3, 3, 3]);
    // sets: a 5:3, b 3:5, c 5:5
    expect(s.map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("gives 2 points for a win and 1 for a loss", () => {
    const s = groupStandings("A", ["a", "b"], [game("a", "b", 3, 1)]);
    expect(s[0]).toMatchObject({ id: "a", points: 2, wins: 1 });
    expect(s[1]).toMatchObject({ id: "b", points: 1, losses: 1 });
  });
});

describe("seeding", () => {
  it("puts group winners first and separates same-group players", () => {
    const players: Player[] = ["a1", "a2", "b1", "b2"].map((id) => ({
      id,
      name: id,
    }));
    const groups = { A: ["a1", "a2"], B: ["b1", "b2"] };
    const games = [game("a1", "a2", 3, 0), game("b1", "b2", 3, 1)];
    const seeding = buildSeeding(players, groups, games);
    expect(seeding.slice(0, 2).map((s) => s.groupPlace)).toEqual([1, 1]);
    // 1 v 4 and 2 v 3 must not be from the same group
    const byseed = seeding.map((s) => s.group);
    expect(byseed[0]).not.toBe(byseed[3]);
    expect(byseed[1]).not.toBe(byseed[2]);
  });

  it("snake distributes by rating", () => {
    const players: Player[] = [100, 90, 80, 70, 60, 50].map((r) => ({
      id: `r${r}`,
      name: `r${r}`,
      rating: r,
    }));
    expect(snakeGroups(players, 3)).toEqual({
      A: ["r100", "r50"],
      B: ["r90", "r60"],
      C: ["r80", "r70"],
    });
  });
});
