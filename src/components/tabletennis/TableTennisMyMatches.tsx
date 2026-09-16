import { useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { SignInButton } from "@/components/common/SignInButton";
import { Registration } from "./Registration";
import { Pager } from "./Pager";
import { pageSlice } from "./ranking";
import { formatDay, formatDayTime } from "./format";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

/** tournaments per page on the "My matches" tab */
const TOURS_PER_PAGE = 5;

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
  created_at?: string | null;
  finished_at?: string | null;
  player1: GamePlayer;
  player2: GamePlayer;
};

type GetGamesByIdResponse = {
  total_found: number;
  games: GameData[];
  missing_ids: string[];
};

function gameTime(g: GameData) {
  return g.finished_at ?? g.created_at ?? null;
}

export function TableTennisMyMatches() {
  const {
    data: playerData,
    isPending: playerPending,
    isError: playerError,
    error: playerErr,
    refetch,
  } = $tabletennis.useQuery("get", "/get-player");

  if (playerPending) return <div className="skeleton h-48 w-full" />;

  if (playerError && isApiHttpError(playerErr) && playerErr.httpCode === 401) {
    return (
      <div className="px-4 py-12">
        <h2 className="mb-4 text-3xl font-medium">Sign in to get access</h2>
        <p className="text-base-content/75 mb-4 text-lg">
          Use your Innopolis account to access table tennis features.
        </p>
        <SignInButton />
      </div>
    );
  }

  if (playerError && isApiHttpError(playerErr) && playerErr.httpCode === 404) {
    return <Registration onRegistered={() => refetch()} />;
  }

  if (playerError) {
    return (
      <p className="text-error py-8 text-center">
        {formatApiErrorMessage(playerErr)}
      </p>
    );
  }

  const player = playerData as SchemaPlayer;

  return <MatchesList playerId={player.innohassle_id} />;
}

function MatchesList({ playerId }: { playerId: string }) {
  const [page, setPage] = useState(0);
  const { data: toursData, isPending: toursPending } = $tabletennis.useQuery(
    "get",
    "/get-tours",
  );

  const tours = useMemo(
    () => (toursData as unknown as TourData[] | undefined) ?? [],
    [toursData],
  );

  const allGameIds = useMemo(() => {
    const ids: string[] = [];
    for (const t of tours) {
      if (t.games?.val_game_ids) ids.push(...t.games.val_game_ids);
      if (t.games?.cval_game_ids) ids.push(...t.games.cval_game_ids);
    }
    return ids;
  }, [tours]);

  const { data: gamesByIdData, isPending: gamesPending } =
    $tabletennis.useQuery(
      "get",
      "/get-games-by-id",
      { params: { query: { ids: allGameIds } } },
      { enabled: allGameIds.length > 0 },
    );

  // grouped by tournament id (two tournaments may share a name), newest first
  const matchesByTournament = useMemo(() => {
    if (!gamesByIdData) return [];
    const games = (gamesByIdData as GetGamesByIdResponse).games ?? [];
    const mine = games.filter(
      (g) =>
        g.player1.innohassle_id === playerId ||
        g.player2.innohassle_id === playerId,
    );
    const byTour = new Map<string, GameData[]>();
    for (const g of mine) {
      if (!byTour.has(g.tour_id)) byTour.set(g.tour_id, []);
      byTour.get(g.tour_id)!.push(g);
    }
    const tourById = new Map(tours.map((t) => [t.id, t]));
    return [...byTour.entries()]
      .map(([tourId, list]) => {
        const tour = tourById.get(tourId);
        return {
          tourId,
          name: tour?.name ?? list[0]?.tournament_name ?? "Unknown",
          date: tour?.date ?? null,
          games: [...list].sort((a, b) =>
            (gameTime(a) ?? "").localeCompare(gameTime(b) ?? ""),
          ),
        };
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [gamesByIdData, playerId, tours]);

  if (toursPending || (allGameIds.length > 0 && gamesPending)) {
    return <div className="skeleton h-48 w-full" />;
  }

  if (matchesByTournament.length === 0) {
    return (
      <p className="text-base-content/50 px-7 py-5 text-center text-sm">
        No matches yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-7">
      <Pager
        page={page}
        total={matchesByTournament.length}
        onChange={setPage}
        pageSize={TOURS_PER_PAGE}
      />
      {pageSlice(matchesByTournament, page, TOURS_PER_PAGE).map((tour) => (
        <div key={tour.tourId}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-base-content min-w-0 truncate text-sm font-semibold">
              {tour.name}
            </h3>
            {tour.date && (
              <span className="text-base-content/40 shrink-0 text-[11px] tabular-nums">
                {formatDay(tour.date)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {tour.games.map((g) => (
              <MatchRow key={g.game_id} game={g} playerId={playerId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchRow({ game, playerId }: { game: GameData; playerId: string }) {
  const isP1 = game.player1.innohassle_id === playerId;
  const me = isP1 ? game.player1 : game.player2;
  const opp = isP1 ? game.player2 : game.player1;
  const won = me.score > opp.score;
  const isFinished = game.finished;
  const when = formatDayTime(gameTime(game));

  return (
    <div className="bg-base-200 rounded-box flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium tabular-nums">
          <span className={cn(won && isFinished && "text-green-500")}>
            {me.nickname}
          </span>
          <span className="text-base-content/30 mx-1.5">
            {me.score}:{opp.score}
          </span>
          <span className={cn(!won && isFinished && "text-green-500")}>
            {opp.nickname}
          </span>
        </span>
        {when && (
          <span className="text-base-content/40 block text-[10px] tabular-nums">
            {when}
          </span>
        )}
      </div>
      {isFinished ? (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            won
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500",
          )}
        >
          {won ? "W" : "L"}
        </span>
      ) : (
        <span className="text-base-content/30 shrink-0 text-[10px]">live</span>
      )}
    </div>
  );
}
