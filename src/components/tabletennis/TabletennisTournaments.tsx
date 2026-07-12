import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { ValidationMatches } from "./ValidationMatches";
import { QualificationMatches } from "./QualificationMatches";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

type TourData = {
  id: string;
  name: string;
  date: string;
  players: string[];
  games: {
    val_game_ids: string[] | null;
    cval_game_ids: string[] | null;
    total_count: number;
  };
};

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

type GetGamesByIdResponse = {
  total_found: number;
  games: GameData[];
  missing_ids: string[];
};

function parsePlayersInput(raw: string): {
  player_ids: string[];
  emails: string[];
} {
  const items = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const player_ids: string[] = [];
  const emails: string[] = [];
  for (const item of items) {
    if (item.includes("@")) {
      emails.push(item);
    } else {
      player_ids.push(item);
    }
  }
  return { player_ids, emails };
}

export function TabletennisTournaments() {
  const [mode, setMode] = useState<"validation" | "qualification">(
    "validation",
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [addPlayersInput, setAddPlayersInput] = useState("");
  const [name, setName] = useState("");
  const [playersInput, setPlayersInput] = useState("");
  const [validationStats, setValidationStats] = useState<
    { playerId: string; wins: number; played: number }[]
  >([]);
  const { showError } = useToast();

  const {
    data: toursData,
    isPending: toursPending,
    refetch: refetchTours,
  } = $tabletennis.useQuery("get", "/active-tours");

  const { data: playersData } = $tabletennis.useQuery("get", "/players");

  const { mutate: createTour, isPending: creating } = $tabletennis.useMutation(
    "post",
    "/reg-tour",
    {
      onSuccess: () => {
        refetchTours();
        setShowCreateForm(false);
        setName("");
        setPlayersInput("");
      },
      onError: (error) => {
        if (isApiHttpError(error) && error.httpCode === 403) {
          showError(
            "Access denied",
            "Only administrators can create tournaments",
          );
        } else {
          showError("Error", formatApiErrorMessage(error));
        }
      },
    },
  );

  const { mutate: finishTour, isPending: finishing } = $tabletennis.useMutation(
    "post",
    "/finish-tour",
    {
      onSuccess: () => {
        refetchTours();
        setMode("validation");
      },
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  const { mutate: addPlayers, isPending: addingPlayers } =
    $tabletennis.useMutation("post", "/reg-tour/add-player", {
      onSuccess: () => {
        refetchTours();
        setShowAddPlayers(false);
        setAddPlayersInput("");
      },
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    });

  const activeTour = useMemo(() => {
    if (!toursData) return null;
    const tours = toursData as unknown as TourData[];
    return tours.length > 0 ? tours[0]! : null;
  }, [toursData]);

  const gameIds = useMemo(() => {
    if (!activeTour) return [];
    return [
      ...(activeTour.games.val_game_ids ?? []),
      ...(activeTour.games.cval_game_ids ?? []),
    ];
  }, [activeTour]);

  const { data: gamesByIdData } = $tabletennis.useQuery(
    "get",
    "/get-games-by-id",
    { params: { query: { ids: gameIds } } },
    { enabled: gameIds.length > 0 },
  );

  const playersList = useMemo(() => {
    if (!playersData || !activeTour) return [];
    console.log("[playersList] raw playersData:", playersData);
    console.log("[playersList] activeTour.players:", activeTour.players);
    const raw = playersData as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const list = Array.isArray(raw) ? raw : raw.players;
    const tourPlayerIds = new Set(activeTour.players);
    const result = (list ?? [])
      .filter(
        (p) =>
          tourPlayerIds.has(p.id ?? "") || tourPlayerIds.has(p.innohassle_id),
      )
      .map((p) => ({
        name: p.nickname,
        id: p.innohassle_id,
      }));
    console.log("[playersList] filtered result:", result);
    return result;
  }, [playersData, activeTour]);

  const allGames = useMemo(() => {
    if (!gamesByIdData) return [];
    const response = gamesByIdData as GetGamesByIdResponse;
    return response.games ?? [];
  }, [gamesByIdData]);

  const validationGames = useMemo(() => {
    if (!activeTour?.games?.val_game_ids) return [];
    const ids = new Set(activeTour.games.val_game_ids);
    return allGames.filter((g) => ids.has(g.game_id));
  }, [allGames, activeTour]);

  const qualificationGames = useMemo(() => {
    if (!activeTour?.games?.cval_game_ids) return [];
    const ids = new Set(activeTour.games.cval_game_ids);
    return allGames.filter((g) => ids.has(g.game_id));
  }, [allGames, activeTour]);

  const handleStatsUpdate = useCallback(
    (stats: { playerId: string; wins: number; played: number }[]) => {
      setValidationStats(stats);
    },
    [],
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { player_ids, emails } = parsePlayersInput(playersInput);
    if (!name.trim() || player_ids.length + emails.length < 2) return;
    createTour({
      params: { query: { name: name.trim() } },
      body: { player_ids, emails },
    });
  }

  function handleEndTournament() {
    if (!activeTour) return;
    finishTour({ params: { query: { tour_id: activeTour.id } } });
  }

  function handleAddPlayers() {
    if (!activeTour) return;
    const { player_ids, emails } = parsePlayersInput(addPlayersInput);
    if (player_ids.length + emails.length === 0) return;
    addPlayers({
      params: { query: { tour_id: activeTour.id } },
      body: { player_ids, emails },
    });
  }

  if (toursPending) return <div className="skeleton h-48 w-full" />;

  if (activeTour) {
    return (
      <div>
        <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
          <button
            type="button"
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
              mode === "validation"
                ? "border-b-2 border-b-[#712BB2]"
                : "text-base-content/50 hover:text-base-content",
            )}
            onClick={() => setMode("validation")}
          >
            Validation
          </button>
          <button
            type="button"
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
              mode === "qualification"
                ? "border-b-2 border-b-[#712BB2]"
                : "text-base-content/50 hover:text-base-content",
            )}
            onClick={() => setMode("qualification")}
          >
            Qualification
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-base-content/50 hidden text-xs md:inline">
              {activeTour.name}
            </span>
            <button
              type="button"
              className="border-base-content/30 text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-lg border px-2 py-1 text-[10px] transition-colors md:text-xs"
              onClick={() => setShowAddPlayers(true)}
            >
              Add players
            </button>
            <button
              type="button"
              className="border-base-content/30 text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-lg border px-2 py-1 text-[10px] transition-colors md:text-xs"
              onClick={handleEndTournament}
              disabled={finishing}
            >
              {finishing ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "End tournament"
              )}
            </button>
          </div>
        </div>

        {showAddPlayers && (
          <div className="border-base-300 flex items-center gap-2 border-b px-4 py-3">
            <input
              type="text"
              value={addPlayersInput}
              onChange={(e) => setAddPlayersInput(e.target.value)}
              placeholder="Player emails or IDs (comma or newline separated)"
              className="input input-bordered input-sm flex-1"
            />
            <button
              type="button"
              className="rounded-lg border border-[#712BB2] px-3 py-1 text-xs text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:opacity-40"
              onClick={handleAddPlayers}
              disabled={addingPlayers || !addPlayersInput.trim()}
            >
              {addingPlayers ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Add"
              )}
            </button>
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content text-xs"
              onClick={() => {
                setShowAddPlayers(false);
                setAddPlayersInput("");
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {mode === "validation" && (
          <ValidationMatches
            key={`validation-${activeTour.id}`}
            players={playersList}
            tourId={activeTour.id}
            validationGames={validationGames}
            onStatsUpdate={handleStatsUpdate}
          />
        )}
        {mode === "qualification" && (
          <QualificationMatches
            key={`qualification-${activeTour.id}`}
            players={playersList}
            validationStats={validationStats}
            tourId={activeTour.id}
            qualificationGames={qualificationGames}
          />
        )}
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="flex items-center justify-center px-7 py-16 md:py-24">
        <form
          onSubmit={handleCreate}
          className="bg-base-200 mx-4 w-full max-w-md rounded-lg p-8"
        >
          <h2 className="mb-6 text-2xl font-light">Create tournament</h2>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tournament name"
              className="input input-bordered w-full"
              maxLength={100}
              required
            />
            <textarea
              value={playersInput}
              onChange={(e) => setPlayersInput(e.target.value)}
              placeholder="Player emails or IDs (comma or newline separated)"
              className="textarea textarea-bordered h-24 w-full"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-sm font-medium text-white transition-all duration-150 hover:outline hover:outline-2 hover:outline-[#712BB2]/50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={creating || !name.trim() || !playersInput.trim()}
              >
                {creating ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 px-7 py-16 md:py-24">
      <span className="icon-[mdi--trophy-outline] text-6xl text-[#712BB2]/30 md:text-7xl" />
      <div className="max-w-md text-center">
        <h2 className="text-base-content text-2xl font-light">
          Table tennis tournament
        </h2>
        <p className="text-base-content/70 mt-2 text-sm md:text-base">
          Create a new tournament to start managing validation matches and
          qualification brackets.
        </p>
      </div>
      <button
        type="button"
        className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-8 py-3 text-sm font-medium text-white transition-all duration-150 hover:outline hover:outline-2 hover:outline-[#712BB2]/50 md:px-10 md:py-4 md:text-base"
        onClick={() => setShowCreateForm(true)}
      >
        <span className="icon-[mdi--plus] mr-1.5" />
        Create tournament
      </button>
    </div>
  );
}
