import { useMemo } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { SignInButton } from "@/components/common/SignInButton";
import { Registration } from "./Registration";

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
  const { data: toursData, isPending: toursPending } = $tabletennis.useQuery(
    "get",
    "/get-tours",
  );

  const allGameIds = useMemo(() => {
    if (!toursData) return [];
    const tours = toursData as unknown as TourData[];
    const ids: string[] = [];
    for (const t of tours) {
      if (t.games?.val_game_ids) ids.push(...t.games.val_game_ids);
      if (t.games?.cval_game_ids) ids.push(...t.games.cval_game_ids);
    }
    return ids;
  }, [toursData]);

  const { data: gamesByIdData, isPending: gamesPending } =
    $tabletennis.useQuery(
      "get",
      "/get-games-by-id",
      { params: { query: { ids: allGameIds } } },
      { enabled: allGameIds.length > 0 },
    );

  const myMatches = useMemo(() => {
    if (!gamesByIdData) return [];
    const response = gamesByIdData as GetGamesByIdResponse;
    const games = response.games ?? [];
    return games.filter(
      (g) =>
        g.player1.innohassle_id === playerId ||
        g.player2.innohassle_id === playerId,
    );
  }, [gamesByIdData, playerId]);

  const matchesByTournament = useMemo(() => {
    const map = new Map<string, GameData[]>();
    for (const m of myMatches) {
      const name = m.tournament_name ?? "Unknown";
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(m);
    }
    return map;
  }, [myMatches]);

  if (toursPending || (allGameIds.length > 0 && gamesPending)) {
    return <div className="skeleton h-48 w-full" />;
  }

  if (myMatches.length === 0) {
    return (
      <p className="text-base-content/50 px-7 py-5 text-center text-sm">
        No matches yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-7 py-5">
      {[...matchesByTournament.entries()].map(([tourName, games]) => (
        <div key={tourName}>
          <h3 className="text-base-content mb-3 text-sm font-semibold">
            {tourName}
          </h3>
          <div className="flex flex-col gap-1">
            {games.map((g) => (
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
  const isFinished =
    game.finished || game.player1.score > 0 || game.player2.score > 0;

  return (
    <div className="bg-base-200 rounded-box flex items-center gap-2 px-3 py-2">
      <span className="text-xs font-medium tabular-nums">
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
      {isFinished && (
        <span
          className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium",
            won
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500",
          )}
        >
          {won ? "W" : "L"}
        </span>
      )}
      {!isFinished && (
        <span className="text-base-content/30 ml-auto text-[10px]">—</span>
      )}
    </div>
  );
}
