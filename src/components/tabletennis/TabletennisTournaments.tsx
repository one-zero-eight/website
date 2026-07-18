import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  qual_top?: Record<string, string>;
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

function getPlacementData(tour: TourData):
  | {
      playerId: string;
      placeLabel: string;
    }[]
  | null {
  const qualTop = tour.qual_top;
  if (!qualTop || Object.keys(qualTop).length === 0) return null;

  function ordinal(n: number): string {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  }

  return Object.entries(qualTop)
    .map(([place, playerId]) => ({
      playerId,
      placeLabel: ordinal(Number(place)),
    }))
    .sort((a, b) => {
      const num = (label: string) => Number(label.replace(/\D/g, ""));
      return num(a.placeLabel) - num(b.placeLabel);
    });
}

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
  const [qualificationLocked, setQualificationLocked] = useState(false);
  const [name, setName] = useState("");
  const [playersInput, setPlayersInput] = useState("");
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [showCreateSuggestions, setShowCreateSuggestions] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLTextAreaElement>(null);
  const { showError } = useToast();

  const {
    data: toursData,
    isPending: toursPending,
    refetch: refetchTours,
  } = $tabletennis.useQuery("get", "/active-tours");

  const { data: allToursData } = $tabletennis.useQuery("get", "/get-tours");

  const { data: playersData } = $tabletennis.useQuery("get", "/players");

  const { data: isAdminData } = $tabletennis.useQuery("get", "/isadmin");
  const isAdmin =
    (isAdminData as { is_admin?: boolean } | undefined)?.is_admin ?? false;

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

  const completedTours = useMemo(() => {
    if (!allToursData) return [];
    const activeIds = new Set(
      ((toursData as unknown as TourData[]) ?? []).map((t) => t.id),
    );
    const all = allToursData as unknown as TourData[];
    return all.filter((t) => !activeIds.has(t.id));
  }, [allToursData, toursData]);

  const gameIds = useMemo(() => {
    if (!activeTour) return [];
    return [
      ...(activeTour.games.val_game_ids ?? []),
      ...(activeTour.games.cval_game_ids ?? []),
    ];
  }, [activeTour]);

  const { data: gamesByIdData, refetch: refetchGames } = $tabletennis.useQuery(
    "get",
    "/get-games-by-id",
    { params: { query: { ids: gameIds } } },
    { enabled: gameIds.length > 0 },
  );

  const playersList = useMemo(() => {
    if (!playersData || !activeTour) return [];
    const raw = playersData as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const list = Array.isArray(raw) ? raw : raw.players;
    const tourPlayerIds = new Set(activeTour.players);
    return (list ?? [])
      .filter(
        (p) =>
          tourPlayerIds.has(p.id ?? "") || tourPlayerIds.has(p.innohassle_id),
      )
      .map((p) => ({
        name: p.nickname,
        id: p.innohassle_id,
      }));
  }, [playersData, activeTour]);

  const playerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!playersData) return map;
    const raw = playersData as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const list = Array.isArray(raw) ? raw : raw.players;
    for (const p of list ?? []) {
      map.set(p.innohassle_id, p.nickname);
    }
    return map;
  }, [playersData]);

  const allPlayers = useMemo(() => {
    if (!playersData) return [];
    const raw = playersData as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const list = Array.isArray(raw) ? raw : raw.players;
    return (list ?? []).map((p) => ({
      name: p.nickname,
      id: p.innohassle_id,
    }));
  }, [playersData]);

  const addablePlayers = useMemo(() => {
    if (!playersData || !activeTour) return [];
    const raw = playersData as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const list = Array.isArray(raw) ? raw : raw.players;
    const tourPlayerIds = new Set(activeTour.players);
    return (list ?? []).filter(
      (p) =>
        !tourPlayerIds.has(p.id ?? "") && !tourPlayerIds.has(p.innohassle_id),
    );
  }, [playersData, activeTour]);

  const addInputToken = useMemo(() => {
    const tokens = addPlayersInput.split(/[\n,]+/);
    return tokens[tokens.length - 1]?.trim() ?? "";
  }, [addPlayersInput]);

  const addSuggestions = useMemo(() => {
    if (!addInputToken || addInputToken.length < 1) return [];
    const lower = addInputToken.toLowerCase();
    return addablePlayers
      .filter(
        (p) =>
          p.nickname.toLowerCase().includes(lower) ||
          p.innohassle_id.toLowerCase().includes(lower),
      )
      .slice(0, 10);
  }, [addablePlayers, addInputToken]);

  const createInputToken = useMemo(() => {
    const tokens = playersInput.split(/[\n,]+/);
    return tokens[tokens.length - 1]?.trim() ?? "";
  }, [playersInput]);

  const createSuggestions = useMemo(() => {
    if (!createInputToken || createInputToken.length < 1) return [];
    const lower = createInputToken.toLowerCase();
    return allPlayers
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.id.toLowerCase().includes(lower),
      )
      .slice(0, 10);
  }, [allPlayers, createInputToken]);

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

  const valTop = useMemo(() => {
    return (activeTour as unknown as Record<string, unknown>)?.val_top as
      | Record<string, string>
      | undefined;
  }, [activeTour]);

  const handleAddOutsideClick = useCallback((e: MouseEvent) => {
    if (
      addInputRef.current &&
      !addInputRef.current.parentElement?.contains(e.target as Node)
    ) {
      setShowPlayerSuggestions(false);
    }
  }, []);

  const handleCreateOutsideClick = useCallback((e: MouseEvent) => {
    if (
      createInputRef.current &&
      !createInputRef.current.parentElement?.contains(e.target as Node)
    ) {
      setShowCreateSuggestions(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleAddOutsideClick);
    document.addEventListener("mousedown", handleCreateOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleAddOutsideClick);
      document.removeEventListener("mousedown", handleCreateOutsideClick);
    };
  }, [handleAddOutsideClick, handleCreateOutsideClick]);

  useEffect(() => {
    if (mode === "qualification") {
      refetchTours();
      refetchGames();
    }
  }, [mode, refetchTours, refetchGames]);

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
            {!qualificationLocked && (
              <button
                type="button"
                className="border-base-content/30 text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-lg border px-2 py-1 text-[10px] transition-colors md:text-xs"
                onClick={() => setShowAddPlayers(true)}
              >
                Add players
              </button>
            )}
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

        {showAddPlayers && !qualificationLocked && (
          <div className="border-base-300 flex items-center gap-2 border-b px-4 py-3">
            <div className="relative flex-1">
              <input
                ref={addInputRef}
                type="text"
                value={addPlayersInput}
                onChange={(e) => setAddPlayersInput(e.target.value)}
                onFocus={() => setShowPlayerSuggestions(true)}
                placeholder="Player emails or IDs (comma or newline separated)"
                className="input input-bordered input-sm w-full"
              />
              {showPlayerSuggestions && addSuggestions.length > 0 && (
                <div className="bg-base-100 rounded-box absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto border shadow-lg">
                  {addSuggestions.map((p) => (
                    <button
                      key={p.innohassle_id}
                      type="button"
                      className="hover:bg-base-200 w-full px-3 py-2 text-left text-xs transition-colors"
                      onClick={() => {
                        const tokens = addPlayersInput.split(/[\n,]+/);
                        const lastToken = tokens[tokens.length - 1] ?? "";
                        const prefix = addPlayersInput.slice(
                          0,
                          addPlayersInput.length - lastToken.length,
                        );
                        setAddPlayersInput(prefix + p.innohassle_id + ",\n");
                        setShowPlayerSuggestions(false);
                        addInputRef.current?.focus();
                      }}
                    >
                      <span className="font-medium">{p.nickname}</span>
                      <span className="text-base-content/50 ml-2 text-[10px]">
                        {p.innohassle_id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          />
        )}
        {mode === "qualification" && (
          <QualificationMatches
            key={`qualification-${activeTour.id}`}
            players={playersList}
            validationGames={validationGames}
            valTop={valTop}
            tourId={activeTour.id}
            qualificationGames={qualificationGames}
            onTourRefetch={refetchTours}
            onLock={() => setQualificationLocked(true)}
          />
        )}
      </div>
    );
  }

  if (showCreateForm && isAdmin) {
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
            <div className="relative">
              <textarea
                ref={createInputRef}
                value={playersInput}
                onChange={(e) => setPlayersInput(e.target.value)}
                onFocus={() => setShowCreateSuggestions(true)}
                placeholder="Player emails or IDs (comma or newline separated)"
                className="textarea textarea-bordered h-24 w-full"
                required
              />
              {showCreateSuggestions && createSuggestions.length > 0 && (
                <div className="bg-base-100 rounded-box absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto border shadow-lg">
                  {createSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="hover:bg-base-200 w-full px-3 py-2 text-left text-xs transition-colors"
                      onClick={() => {
                        const tokens = playersInput.split(/[\n,]+/);
                        const lastToken = tokens[tokens.length - 1] ?? "";
                        const prefix = playersInput.slice(
                          0,
                          playersInput.length - lastToken.length,
                        );
                        setPlayersInput(prefix + p.id + ",\n");
                        setShowCreateSuggestions(false);
                        createInputRef.current?.focus();
                      }}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-base-content/50 ml-2 text-[10px]">
                        {p.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
    <>
      <div className="flex flex-col items-center gap-6 px-7 py-16 md:py-24">
        <span className="icon-[mdi--trophy-outline] text-6xl text-[#712BB2]/30 md:text-7xl" />
        <div className="max-w-md text-center">
          <h2 className="text-base-content text-2xl font-light">
            Table tennis tournament
          </h2>
          {isAdmin ? (
            <p className="text-base-content/70 mt-2 text-sm md:text-base">
              Create a new tournament to start managing validation matches and
              qualification brackets.
            </p>
          ) : (
            <p className="text-base-content/50 mt-2 text-sm md:text-base">
              No active tournament at the moment.
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-8 py-3 text-sm font-medium text-white transition-all duration-150 hover:outline hover:outline-2 hover:outline-[#712BB2]/50 md:px-10 md:py-4 md:text-base"
            onClick={() => setShowCreateForm(true)}
          >
            <span className="icon-[mdi--plus] mr-1.5" />
            Create tournament
          </button>
        )}
      </div>

      {completedTours.length > 0 && (
        <div className="mt-8 border-t px-2 pt-6">
          <h2 className="text-base-content mb-4 px-5 text-lg font-light">
            Completed tournaments
          </h2>
          <div className="flex flex-col gap-4">
            {completedTours.map((tour) => {
              const placements = getPlacementData(tour);
              return (
                <div key={tour.id} className="bg-base-200 rounded-box mx-5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{tour.name}</span>
                  </div>
                  {placements ? (
                    <div className="flex flex-col gap-1">
                      {[...placements]
                        .sort((a, b) =>
                          a.placeLabel.localeCompare(b.placeLabel),
                        )
                        .map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs font-medium">
                              {playerNameMap.get(p.playerId) ?? p.playerId}
                            </span>
                            <span className="text-base-content/50 text-[10px]">
                              {p.placeLabel}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-base-content/50 text-xs">
                      No placement data
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
