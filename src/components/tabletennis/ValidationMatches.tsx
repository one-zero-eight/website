import { useState, useEffect, Fragment } from "react";
import { cn } from "@/lib/ui/cn";

type Match = {
  player1_id: string;
  player2_id: string;
};

type CompletedMatch = Match & {
  score_player1: number;
  score_player2: number;
};

function matchKey(m: Match) {
  return [m.player1_id, m.player2_id].sort().join("-");
}

export function ValidationMatches({
  players,
  onStatsUpdate,
}: {
  players: { name: string; id: string }[];
  onStatsUpdate?: (
    stats: { playerId: string; wins: number; played: number }[],
  ) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<CompletedMatch[]>(
    [],
  );
  const [localScores, setLocalScores] = useState<
    Record<string, [number, number]>
  >({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [activeCompletedKey, setActiveCompletedKey] = useState<string | null>(
    null,
  );

  const ongoingIds = ongoingMatches.flatMap((m) => [
    m.player1_id,
    m.player2_id,
  ]);
  const unavailableIds = ongoingIds;
  const availablePlayers = players.filter(
    (p) => !unavailableIds.includes(p.id),
  );

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

  function handleStartGame() {
    if (selectedIds.length !== 2) return;
    const match: Match = {
      player1_id: selectedIds[0]!,
      player2_id: selectedIds[1]!,
    };
    setOngoingMatches((prev) => [...prev, match]);
    setLocalScores((prev) => ({ ...prev, [matchKey(match)]: [0, 0] }));
    setSelectedIds([]);
  }

  function handleComplete(match: Match) {
    const key = matchKey(match);
    const scores = localScores[key] ?? [0, 0];
    const completed: CompletedMatch = {
      ...match,
      score_player1: scores[0],
      score_player2: scores[1],
    };
    setCompletedMatches((prev) => [...prev, completed]);
    setOngoingMatches((prev) => prev.filter((m) => matchKey(m) !== key));
  }

  function handleEdit(key: string) {
    setEditingKey(key);
    setActiveCompletedKey(key);
  }

  function handleSaveEdit(key: string, score1: number, score2: number) {
    setCompletedMatches((prev) =>
      prev.map((m) => {
        if (matchKey(m) !== key) return m;
        return { ...m, score_player1: score1, score_player2: score2 };
      }),
    );
    setEditingKey(null);
  }

  function handleDelete(key: string) {
    setCompletedMatches((prev) => prev.filter((m) => matchKey(m) !== key));
    if (editingKey === key) setEditingKey(null);
    if (activeCompletedKey === key) setActiveCompletedKey(null);
  }

  function handleScoreChange(match: Match, player: 1 | 2, value: string) {
    const key = matchKey(match);
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

  function MatchCard({
    match,
    isCompleted,
  }: {
    match: Match | CompletedMatch;
    isCompleted: boolean;
  }) {
    const key = matchKey(match);
    const scores =
      "score_player1" in match
        ? [match.score_player1, match.score_player2]
        : (localScores[key] ?? [0, 0]);

    const isEditing = isCompleted && editingKey === key;
    const [tempScore1, setTempScore1] = useState(0);
    const [tempScore2, setTempScore2] = useState(0);

    useEffect(() => {
      if (isEditing) {
        setTempScore1(scores[0]);
        setTempScore2(scores[1]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    const showActions = isCompleted && activeCompletedKey === key;

    if (isCompleted) {
      if (isEditing) {
        return (
          <div className="bg-base-200 rounded-box border border-[#712BB2]/30 p-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-medium md:text-sm">
              <span className="truncate text-left">
                {getPlayerName(match.player1_id)}
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={tempScore1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempScore1(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="input input-xs bg-base-100 w-10 rounded-lg text-center"
                />
                <span className="text-base-content/50">:</span>
                <input
                  type="number"
                  min={0}
                  value={tempScore2}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setTempScore2(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="input input-xs bg-base-100 w-10 rounded-lg text-center"
                />
              </div>
              <span className="truncate text-right">
                {getPlayerName(match.player2_id)}
              </span>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 md:text-xs"
                onClick={() => handleSaveEdit(key, tempScore1, tempScore2)}
              >
                Save
              </button>
              <button
                type="button"
                className="border-base-content/30 text-base-content/50 hover:bg-base-content/10 rounded-lg border px-2 py-1 text-[10px] transition-colors md:text-xs"
                onClick={() => setEditingKey(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }

      return (
        <div
          className="bg-base-200 rounded-box cursor-pointer border border-[#712BB2]/30 p-3"
          onClick={() =>
            setActiveCompletedKey((prev) => (prev === key ? null : key))
          }
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-medium md:text-sm">
            <span className="truncate text-left">
              {getPlayerName(match.player1_id)}
            </span>
            <div className="flex items-center justify-center gap-1.5 md:gap-3">
              <span className="tabular-nums">{scores[0]}</span>
              <span className="text-base-content/50">:</span>
              <span className="tabular-nums">{scores[1]}</span>
            </div>
            <span className="truncate text-right">
              {getPlayerName(match.player2_id)}
            </span>
          </div>
          {showActions && (
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 md:text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(key);
                }}
              >
                <span className="icon-[mdi--pencil] mr-0.5" />
                Edit
              </button>
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
    }

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
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleScoreChange(match, 1, e.target.value)}
            className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center"
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
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleScoreChange(match, 2, e.target.value)}
            className="input input-xs bg-base-100 w-10 shrink-0 rounded-lg text-center"
          />
        </div>
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-[#712BB2] px-2 py-1 text-[10px] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 md:text-xs"
            onClick={() => handleComplete(match)}
          >
            Complete
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
          disabled={selectedIds.length !== 2}
          className={cn(
            "rounded-xl border-2 border-[#712BB2] px-4 py-2 text-xs font-medium transition-all duration-150 md:px-6 md:py-3 md:text-sm",
            selectedIds.length === 2
              ? "bg-[#712BB2] text-white hover:bg-[#712BB2]/90"
              : "text-base-content/30 border-base-content/30 cursor-not-allowed",
          )}
          onClick={handleStartGame}
        >
          Start game
        </button>
      </div>

      {ongoingMatches.length > 0 && (
        <div>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            Ongoing matches
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ongoingMatches.map((m, i) => (
              <MatchCard
                key={matchKey(m) + "-" + i}
                match={m}
                isCompleted={false}
              />
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
            {completedMatches.map((m, i) => (
              <MatchCard
                key={matchKey(m) + "-" + i}
                match={m}
                isCompleted={true}
              />
            ))}
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
