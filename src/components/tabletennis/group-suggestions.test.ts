import { describe, expect, it } from "vitest";
import {
  buildSeeding,
  resolveBracket,
  suggestNextMatches,
  type GameData,
} from "./bracket-utils";

let counter = 0;
function game(
  p1: string,
  p2: string,
  s1: number,
  s2: number,
  finished = true,
): GameData {
  counter++;
  const side = (id: string, score: number) => ({
    innohassle_id: id,
    nickname: id,
    rating: 0,
    registered: true,
    score,
  });
  return {
    game_id: `g${counter}`,
    tour_id: "t",
    tournament_name: "t",
    finished,
    player1: side(p1, s1),
    player2: side(p2, s2),
  };
}

describe("suggestNextMatches", () => {
  const groups = {
    A: ["a1", "a2", "a3"],
    B: ["b1", "b2", "b3"],
    C: ["c1", "c2", "c3", "c4"],
  };

  it("starts with the group that has the most games left", () => {
    const games = [
      game("a1", "a2", 3, 0),
      game("a1", "a3", 3, 1),
      game("b1", "b2", 3, 2),
      game("b1", "b3", 3, 0),
    ];
    const s = suggestNextMatches(groups, games, 3);
    expect(s.map((x) => x.group)).toEqual(["C", "A", "B"]);
    expect(s[0]!.remaining).toBe(6);
    expect(s[1]).toMatchObject({ group: "A", remaining: 1 });
    expect([s[1]!.p1, s[1]!.p2].sort()).toEqual(["a2", "a3"]);
  });

  it("prefers players who played less and never suggests busy players", () => {
    const games = [
      game("c1", "c2", 3, 0),
      game("c1", "c3", 3, 0),
      game("c2", "c4", 0, 0, false), // c2 and c4 are at the table right now
    ];
    const [c] = suggestNextMatches({ C: groups.C }, games, 1);
    // free unstarted pairs: c1-c4 (busy), c3-c4 (busy), c2-c3 (busy) -> nothing
    expect(c).toBeUndefined();

    const finishedLive = games.map((g) => ({ ...g, finished: true }));
    const [next] = suggestNextMatches({ C: groups.C }, finishedLive, 1);
    // c3 played 1, c4 played 1, c1 played 2, c2 played 2 -> c3 vs c4
    expect([next!.p1, next!.p2].sort()).toEqual(["c3", "c4"]);
  });

  it("does not use one player in two suggestions and respects the limit", () => {
    const s = suggestNextMatches(groups, [], 2);
    expect(s).toHaveLength(2);
    const ids = s.flatMap((x) => [x.p1, x.p2]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns nothing when every game has been started", () => {
    const games = [
      game("a1", "a2", 3, 0),
      game("a1", "a3", 3, 0),
      game("a2", "a3", 3, 0),
    ];
    expect(suggestNextMatches({ A: groups.A }, games)).toEqual([]);
  });
});

describe("partial standings", () => {
  it("keeps places that are already decided when the bracket is unfinished", () => {
    // 5 players in an 8 bracket: seeds 1-3 get byes, only 4 v 5 is a real first-round match
    const seeding = ["p1", "p2", "p3", "p4", "p5"];
    const games = [
      game("p4", "p5", 3, 1),
      game("p1", "p4", 3, 0), // semi-final
      game("p2", "p3", 3, 2), // semi-final
      game("p1", "p2", 3, 1), // final
    ];
    const bracket = resolveBracket(seeding, games);
    expect(bracket.complete).toBe(false); // 3rd place match not played
    const places = [...bracket.places].sort((a, b) => a.place - b.place);
    expect(places).toEqual([
      { id: "p1", place: 1 },
      { id: "p2", place: 2 },
      { id: "p5", place: 5 },
    ]);
  });
});

describe("seeding details", () => {
  it("carries group points and sets for display", () => {
    const players = ["a1", "a2"].map((id) => ({ id, name: id }));
    const [first, second] = buildSeeding(players, { A: ["a1", "a2"] }, [
      game("a1", "a2", 3, 1),
    ]);
    expect(first).toMatchObject({
      id: "a1",
      points: 2,
      setsWon: 3,
      setsLost: 1,
    });
    expect(second).toMatchObject({ id: "a2", points: 1, played: 1 });
  });
});
