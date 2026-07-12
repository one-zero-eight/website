import { useState, useEffect, Fragment } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";

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

function matchKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

export function ValidationMatches({
  players,
  tourId,
  validationGames,
  onStatsUpdate,
}: {
  players: { name: string; id: string }[];
  tourId: string;
  validationGames: GameData[];
  onStatsUpdate?: (
    stats: { playerId: string; wins: number; played: number }[],
  ) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ongoingMatches, setOngoingMatches] = useState<
    { game_id: string; player1_id: string; player2_id: string }[]
  >([]);
  const [completedMatches, setCompletedMatches] = useState<
    {
      game_id: string;
      player1_id: string;
      player2_id: string;
      score_player1: number;
      score_player2: number;
    }[]
  >([]);
  const [localScores, setLocalScores] = useState<
    Record<string, [number, number]>
  >({});
  const [activeCompletedKey, setActiveCompletedKey] = useState<string | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [finishing, setFinishing] = useState<string | null>(null);
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

  useEffect(() => {
    for (const game of validationGames) {
      const p1Id = game.player1.innohassle_id;
      const p2Id = game.player2.innohassle_id;
      const key = matchKey(p1Id, p2Id);
      if (game.finished || game.player1.score > 0 || game.player2.score > 0) {
        setCompletedMatches((prev) => {
          if (prev.some((m) => m.game_id === game.game_id)) return prev;
          return [
            ...prev,
            {
              game_id: game.game_id,
              player1_id: p1Id,
              player2_id: p2Id,
              score_player1: game.player1.score,
              score_player2: game.player2.score,
            },
          ];
        });
      } else {
        setOngoingMatches((prev) => {
          if (prev.some((m) => matchKey(m.player1_id, m.player2_id) === key))
            return prev;
          return [
            ...prev,
            {
              game_id: game.game_id,
              player1_id: p1Id,
              player2_id: p2Id,
            },
          ];
        });
      }
    }
  }, [validationGames]);

  const ongoingIds = ongoingMatches.flatMap((m) => [
    m.player1_id,
    m.player2_id,
  ]);
  const availablePlayers = players.filter((p) => !ongoingIds.includes(p.id));

  useEffect(() => {
    if (!onStatsUpdate) return;
    const stats = players.map((p) => {
      const played = completedMatches.filter(
        (m) => m.player1_id === p.id || m.player2_id === p.id,
      ).length;
      const wins = completedMatches.filter(
        (m) =>
          (m.player1_id === p.id && m.score_player1 > m.score_player2) ||
          (m.player2_id === p.id && m.score_player2 > m.score_player1),
      ).length;
      return { playerId: p.id, wins, played };
    });
    onStatsUpdate(stats);
  }, [completedMatches, players, onStatsUpdate]);

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function handleStartGame() {
    if (selectedIds.length !== 2) return;
    setCreating(true);
    try {
      const result = await createGame({
        params: {
          query: {
            tour_id: tourId,
            tip: "val" as const,
            player1_id: selectedIds[0],
            player2_id: selectedIds[1],
          },
        },
      } as any);

      const gameId =
        (result as any)?.id ??
        (result as any)?._id ??
        (result as any)?.game_id ??
        "";
      setOngoingMatches((prev) => [
        ...prev,
        {
          game_id: gameId,
          player1_id: selectedIds[0]!,
          player2_id: selectedIds[1]!,
        },
      ]);
      setLocalScores((prev) => ({
        ...prev,
        [matchKey(selectedIds[0]!, selectedIds[1]!)]: [0, 0],
      }));
      setSelectedIds([]);
    } catch {
      // error handled by onError callback
    } finally {
      setCreating(false);
    }
  }

  async function handleComplete(match: {
    game_id: string;
    player1_id: string;
    player2_id: string;
  }) {
    const key = matchKey(match.player1_id, match.player2_id);
    const scores = localScores[key] ?? [0, 0];
    setFinishing(match.game_id);
    try {
      await finishGame({
        params: {
          query: {
            game_id: match.game_id,
            s1: scores[0],
            s2: scores[1],
            tour_id: tourId,
          },
        },
      } as any);

      setCompletedMatches((prev) => [
        ...prev,
        {
          game_id: match.game_id,
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          score_player1: scores[0],
          score_player2: scores[1],
        },
      ]);
      setOngoingMatches((prev) =>
        prev.filter((m) => m.game_id !== match.game_id),
      );
    } catch {
      // error handled by onError callback
    } finally {
      setFinishing(null);
    }
  }

  function handleDelete(key: string) {
    setCompletedMatches((prev) =>
      prev.filter((m) => matchKey(m.player1_id, m.player2_id) !== key),
    );
    setOngoingMatches((prev) =>
      prev.filter((m) => matchKey(m.player1_id, m.player2_id) !== key),
    );
    setActiveCompletedKey((prev) => (prev === key ? null : prev));
  }

  function handleScoreChange(
    match: { player1_id: string; player2_id: string },
    player: 1 | 2,
    value: string,
  ) {
    const key = matchKey(match.player1_id, match.player2_id);
    setLocalScores((prev) => {
      const current = prev[key] ?? [0, 0];
      const next: [number, number] =
        player === 1
          ? [Math.max(0, Number(value) || 0), current[1]]
          : [current[0], Math.max(0, Number(value) || 0)];
      return { ...prev, [key]: next };
    });
  }

  function getPlayerName(id: string) {
    return players.find((p) => p.id === id)?.name ?? id;
  }

  function getKey(match: { player1_id: string; player2_id: string }) {
    return matchKey(match.player1_id, match.player2_id);
  }

  function OngoingCard({
    match,
  }: {
    match: { game_id: string; player1_id: string; player2_id: string };
  }) {
    const key = getKey(match);
    const scores = localScores[key] ?? [0, 0];
    const isFinishing = finishing === match.game_id;

    return (
      <div className="bg-base-200 rounded-box flex flex-col gap-2 border border-[#712BB2]/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium md:text-sm">
            {getPlayerName(match.player1_id)}
          </p>
          <input
            type="number"
            min={0}
            value={scores[0]}
            disabled={isFinishing}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleScoreChange(match, 1, e.target.value)}
            className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium md:text-sm">
            {getPlayerName(match.player2_id)}
          </p>
          <input
            type="number"
            min={0}
            value={scores[1]}
            disabled={isFinishing}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleScoreChange(match, 2, e.target.value)}
            className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center disabled:opacity-30"
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            disabled={isFinishing}
            className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:opacity-40"
            onClick={() => handleComplete(match)}
          >
            {isFinishing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Complete"
            )}
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-400 px-2 py-1 text-[10px] text-red-400 transition-colors hover:bg-red-400/10"
            onClick={() => handleDelete(getKey(match))}
          >
            <span className="icon-[mdi--delete] mr-0.5" />
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-7 py-5">
      <h2 className="text-base-content text-xl font-light">
        Select two players for a match
      </h2>

      <div className="flex flex-wrap gap-3">
        {availablePlayers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleToggle(p.id)}
            className={cn(
              "rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-all duration-150 md:px-4 md:py-2 md:text-sm",
              selectedIds.includes(p.id)
                ? "border-[#712BB2] bg-[#712BB2] text-white"
                : "border-[#712BB2] hover:bg-[#712BB2]/10",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-base-content/70 text-sm">
          Selected: {selectedIds.map((id) => getPlayerName(id)).join(", ")}
        </p>
      )}

      <div>
        <button
          type="button"
          disabled={selectedIds.length !== 2 || creating}
          className={cn(
            "rounded-xl border-2 border-[#712BB2] px-4 py-2 text-xs font-medium transition-all duration-150 md:px-6 md:py-3 md:text-sm",
            selectedIds.length === 2 && !creating
              ? "bg-[#712BB2] text-white hover:bg-[#712BB2]/90"
              : "text-base-content/30 border-base-content/30 cursor-not-allowed",
          )}
          onClick={handleStartGame}
        >
          {creating ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Start game"
          )}
        </button>
      </div>

      {ongoingMatches.length > 0 && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Ongoing matches
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ongoingMatches.map((m, i) => (
              <OngoingCard key={m.game_id || `${getKey(m)}-${i}`} match={m} />
            ))}
          </div>
        </div>
      )}

      {completedMatches.length > 0 && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Completed matches
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {completedMatches.map((m, i) => {
              const key = getKey(m);
              const isActive = activeCompletedKey === key;
              return (
                <div
                  key={m.game_id || `${key}-${i}`}
                  className="bg-base-200 rounded-box cursor-pointer border border-[#712BB2]/30 p-3"
                  onClick={() =>
                    setActiveCompletedKey((prev) => (prev === key ? null : key))
                  }
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-medium md:text-sm">
                    <span className="truncate text-left">
                      {getPlayerName(m.player1_id)}
                    </span>
                    <div className="flex items-center justify-center gap-1.5 md:gap-3">
                      <span className="tabular-nums">{m.score_player1}</span>
                      <span className="text-base-content/50">:</span>
                      <span className="tabular-nums">{m.score_player2}</span>
                    </div>
                    <span className="truncate text-right">
                      {getPlayerName(m.player2_id)}
                    </span>
                  </div>
                  {isActive && (
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-red-400 px-2 py-1 text-[10px] text-red-400 transition-colors hover:bg-red-400/10 md:text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(key);
                        }}
                      >
                        <span className="icon-[mdi--delete] mr-0.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedMatches.length > 0 && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Player stats
          </h3>
          <div className="bg-base-200 rounded-box border border-[#712BB2]/30 p-3">
            {(() => {
              const stats = players
                .map((p) => {
                  const played = completedMatches.filter(
                    (m) => m.player1_id === p.id || m.player2_id === p.id,
                  ).length;
                  const wins = completedMatches.filter(
                    (m) =>
                      (m.player1_id === p.id &&
                        m.score_player1 > m.score_player2) ||
                      (m.player2_id === p.id &&
                        m.score_player2 > m.score_player1),
                  ).length;
                  return { ...p, played, wins };
                })
                .filter((s) => s.played > 0);

              return (
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-xs md:text-sm">
                  {stats.map((s) => (
                    <Fragment key={s.id}>
                      <span className="truncate">{s.name}</span>
                      <span className="text-base-content/70 tabular-nums">
                        {s.played} played
                      </span>
                      <span className="text-base-content/70 tabular-nums">
                        {s.wins} win{s.wins !== 1 ? "s" : ""}
                      </span>
                    </Fragment>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {availablePlayers.length === 0 && ongoingMatches.length === 0 && (
        <p className="text-base-content/50 text-center text-sm">
          All players have played
        </p>
      )}
    </div>
  );
}
