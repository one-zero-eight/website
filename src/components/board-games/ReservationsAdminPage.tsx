import { $boardGames } from "@/api/board-games";
import { type SchemaReservation } from "@/api/board-games/types.ts";
import {
  byCreatedAtDesc,
  ListState,
  QueryError,
  ReservationStatusBadge,
  SearchInput,
  SkeletonGrid,
  telegramHandle,
  withId,
} from "@/components/board-games/shared.tsx";
import { ReservationDetailsModal } from "@/components/board-games/ReservationDetailsModal.tsx";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function ReservationsAdminPage({ gameId }: { gameId?: string }) {
  const navigate = useNavigate();
  const reservationsQuery = $boardGames.useQuery("get", "/admin/reservations", {
    params: { query: { how: "all" } },
  });
  const gamesQuery = $boardGames.useQuery("get", "/admin/board-games");
  const [telegramQuery, setTelegramQuery] = useState("");
  const [gameQuery, setGameQuery] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [reservationToView, setReservationToView] =
    useState<SchemaReservation | null>(null);

  const gameTitles = new Map(
    withId(gamesQuery.data).map((game) => [game.id, game.title]),
  );
  const normalizedTelegramQuery = normalizeSearchValue(telegramQuery, true);
  const normalizedGameQuery = normalizeSearchValue(gameQuery);
  const createdFromTimestamp = getDateBoundary(createdFrom, "start");
  const createdToTimestamp = getDateBoundary(createdTo, "end");
  const reservations = byCreatedAtDesc(withId(reservationsQuery.data));
  const filteredReservations = reservations.filter((reservation) => {
    const telegramAlias = normalizeSearchValue(
      reservation.tg_alias ?? "",
      true,
    );
    const gameTitle = normalizeSearchValue(
      gameTitles.get(reservation.board_game_id) ?? "",
    );
    const createdAtTimestamp = new Date(reservation.created_at).getTime();

    if (gameId && reservation.board_game_id !== gameId) return false;
    if (
      normalizedTelegramQuery &&
      !telegramAlias.includes(normalizedTelegramQuery)
    ) {
      return false;
    }
    if (normalizedGameQuery && !gameTitle.includes(normalizedGameQuery)) {
      return false;
    }
    if (
      createdFromTimestamp !== null &&
      createdAtTimestamp < createdFromTimestamp
    ) {
      return false;
    }
    if (
      createdToTimestamp !== null &&
      createdAtTimestamp > createdToTimestamp
    ) {
      return false;
    }
    return true;
  });
  const hasFilters = Boolean(
    gameId || telegramQuery || gameQuery || createdFrom || createdTo,
  );
  const selectedGameTitle = gameId
    ? (gameTitles.get(gameId) ?? "Unknown game")
    : null;

  function handleClearFilters() {
    setTelegramQuery("");
    setGameQuery("");
    setCreatedFrom("");
    setCreatedTo("");
    navigate({
      to: "/board-games/admin/reservations",
      search: { gameId: undefined },
      replace: true,
    });
  }

  function handleClearGameFilter() {
    navigate({
      to: "/board-games/admin/reservations",
      search: { gameId: undefined },
      replace: true,
    });
  }

  return (
    <main className="@container/content mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 @md/content:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All reservations</h1>
          {!reservationsQuery.isPending && !reservationsQuery.error && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {hasFilters
                ? `${filteredReservations.length} of ${reservations.length} reservations`
                : `${reservations.length} reservations`}
            </p>
          )}
        </div>
        <Link to="/board-games/admin" className="btn btn-ghost btn-sm">
          <span className="icon-[material-symbols--arrow-back] text-lg" />
          Board games admin
        </Link>
      </div>

      <section className="card card-border bg-base-100">
        <div className="card-body gap-4 p-4">
          {selectedGameTitle && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Game filter:
              </span>
              <span className="badge badge-primary badge-outline gap-1">
                {selectedGameTitle}
                <button
                  type="button"
                  className="flex items-center"
                  onClick={handleClearGameFilter}
                  title="Clear game filter"
                >
                  <span className="icon-[material-symbols--close] text-base" />
                </button>
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 @md/content:grid-cols-2">
            <SearchInput
              value={gameQuery}
              onValueChange={setGameQuery}
              placeholder="Search by game name"
              disabled={gamesQuery.isPending || Boolean(gamesQuery.error)}
            />
            <SearchInput
              value={telegramQuery}
              onValueChange={setTelegramQuery}
              placeholder="Search by Telegram alias"
              iconClassName="icon-[mdi--telegram]"
            />
          </div>

          <div className="flex flex-col gap-3 @md/content:flex-row @md/content:items-end">
            <label className="fieldset grow">
              <span className="fieldset-legend">Created from</span>
              <input
                type="date"
                className="input w-full"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
                max={createdTo || undefined}
              />
            </label>
            <label className="fieldset grow">
              <span className="fieldset-legend">Created to</span>
              <input
                type="date"
                className="input w-full"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
                min={createdFrom || undefined}
              />
            </label>
            {hasFilters && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClearFilters}
              >
                <span className="icon-[material-symbols--filter-alt-off-outline] text-xl" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {Boolean(gamesQuery.error) && (
        <QueryError
          title="Could not load game names"
          error={gamesQuery.error}
        />
      )}
      <ListState
        isPending={reservationsQuery.isPending}
        error={reservationsQuery.error}
        errorTitle="Could not load reservations"
        emptyMessage={
          reservations.length === 0
            ? "There are no reservations yet."
            : filteredReservations.length === 0
              ? "No reservations match these filters."
              : undefined
        }
        pending={
          <SkeletonGrid
            count={6}
            className="grid grid-cols-1 gap-3 @2xl/content:grid-cols-2"
            itemClassName="h-36"
          />
        }
      >
        <div className="grid grid-cols-1 gap-3 @2xl/content:grid-cols-2">
          {filteredReservations.map((reservation) => (
            <ReservationResult
              key={reservation.id}
              reservation={reservation}
              gameTitle={gameTitles.get(reservation.board_game_id)}
              onView={() => setReservationToView(reservation)}
            />
          ))}
        </div>
      </ListState>
      {reservationToView && (
        <ReservationDetailsModal
          reservation={reservationToView}
          gameTitle={gameTitles.get(reservationToView.board_game_id)}
          onOpenChange={(open) => !open && setReservationToView(null)}
        />
      )}
    </main>
  );
}

function ReservationResult({
  reservation,
  gameTitle,
  onView,
}: {
  reservation: SchemaReservation;
  gameTitle?: string;
  onView: () => void;
}) {
  const telegram = telegramHandle(reservation.tg_alias);

  return (
    <article
      className="card card-border bg-base-100 hover:bg-base-200/60 min-w-0 cursor-pointer transition-colors"
      onClick={onView}
    >
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="card-title truncate text-base">
              {gameTitle ?? "Unknown game"}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-200">
              {new Date(reservation.created_at).toLocaleString()}
            </p>
          </div>
          <ReservationStatusBadge status={reservation.status} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 text-sm text-neutral-500 @sm/content:grid-cols-2 dark:text-neutral-200">
          <div className="flex min-w-0 items-center gap-2">
            <span className="icon-[mdi--telegram] text-primary shrink-0 text-xl" />
            {telegram ? (
              <a
                className="link link-hover truncate"
                href={`https://t.me/${telegram}`}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                @{telegram}
              </a>
            ) : (
              <span className="text-neutral-400">Telegram not provided</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="icon-[material-symbols--mail-outline] text-primary shrink-0 text-xl" />
            <span className="truncate">{reservation.user_email}</span>
          </div>
          {reservation.borrower_name && (
            <div className="flex min-w-0 items-center gap-2">
              <span className="icon-[material-symbols--person-outline] text-primary shrink-0 text-xl" />
              <span className="truncate">{reservation.borrower_name}</span>
            </div>
          )}
          {reservation.return_date && (
            <div className="flex min-w-0 items-center gap-2">
              <span className="icon-[material-symbols--event-outline] text-primary shrink-0 text-xl" />
              <span>
                Return by{" "}
                <span className="text-neutral-400">
                  {reservation.return_date}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function normalizeSearchValue(value: string, removeAtSign = false) {
  const normalizedValue = value.trim().toLocaleLowerCase();
  return removeAtSign ? normalizedValue.replace(/^@/, "") : normalizedValue;
}

function getDateBoundary(value: string, boundary: "start" | "end") {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    boundary === "start" ? 0 : 23,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 999,
  );
  return date.getTime();
}
