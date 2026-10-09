import { ReservationOverdueTag } from "./ReservationOverdueTag";
import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type { SchemaReservationOut } from "@/api/board-games/types.ts";
import { ReservationDetailsModal } from "@/components/board-games/ReservationDetailsModal.tsx";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { formatReservationDate } from "./reservation-presentation";
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
    useState<SchemaReservationOut | null>(null);

  const gameTitles = new Map(
    (gamesQuery.data ?? []).map((game) => [game.id, game.title]),
  );
  const normalizedTelegramQuery = normalizeSearchValue(telegramQuery, true);
  const normalizedGameQuery = normalizeSearchValue(gameQuery);
  const createdFromTimestamp = getDateBoundary(createdFrom, "start");
  const createdToTimestamp = getDateBoundary(createdTo, "end");
  const reservations = reservationsQuery.data ?? [];
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
            <p className="text-base-content/60 text-sm">
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

      <section className="border-base-300 bg-base-100 rounded-box flex flex-col gap-4 border p-4">
        {selectedGameTitle && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base-content/60 text-sm">Game filter:</span>
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
          <label className="input w-full">
            <span className="icon-[material-symbols--search] text-base-content/50 shrink-0 text-xl" />
            <input
              type="search"
              className="grow"
              value={gameQuery}
              onChange={(event) => setGameQuery(event.target.value)}
              placeholder="Search by game name"
              disabled={gamesQuery.isPending || Boolean(gamesQuery.error)}
            />
          </label>
          <label className="input w-full">
            <span className="icon-[mdi--telegram] text-base-content/50 shrink-0 text-xl" />
            <input
              type="search"
              className="grow"
              value={telegramQuery}
              onChange={(event) => setTelegramQuery(event.target.value)}
              placeholder="Search by Telegram alias"
            />
          </label>
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
      </section>

      {reservationsQuery.isPending && <ReservationsSkeleton />}
      {Boolean(reservationsQuery.error) && (
        <QueryError
          title="Could not load reservations"
          error={reservationsQuery.error}
        />
      )}
      {Boolean(gamesQuery.error) && (
        <QueryError
          title="Could not load game names"
          error={gamesQuery.error}
        />
      )}

      {!reservationsQuery.isPending &&
        !reservationsQuery.error &&
        reservations.length === 0 && (
          <EmptyState message="There are no reservations yet." />
        )}
      {!reservationsQuery.isPending &&
        !reservationsQuery.error &&
        reservations.length > 0 &&
        filteredReservations.length === 0 && (
          <EmptyState message="No reservations match these filters." />
        )}
      {!reservationsQuery.isPending &&
        !reservationsQuery.error &&
        filteredReservations.length > 0 && (
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
        )}
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
  reservation: SchemaReservationOut;
  gameTitle?: string;
  onView: () => void;
}) {
  return (
    <article className="border-base-300 bg-base-100 rounded-box flex min-w-0 flex-col overflow-hidden border shadow-sm">
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary rounded-box flex h-10 w-10 shrink-0 items-center justify-center">
              <span className="icon-[mdi--dice-multiple-outline] text-2xl" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold wrap-break-word">
                {gameTitle ?? "Unknown game"}
              </h2>
              <p className="text-base-content/50 mt-1 text-xs">
                Reserved{" "}
                {new Date(reservation.created_at).toLocaleDateString(
                  undefined,
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
            <ReservationStatusBadge status={reservation.status} />
            <ReservationOverdueTag reservation={reservation} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 text-sm">
          <p className="text-base-content/50 text-xs font-medium">BORROWER</p>
          <p className="font-medium wrap-break-word">
            {reservation.borrower_name || reservation.user_email}
          </p>
          {reservation.borrower_name && (
            <p className="text-base-content/60 wrap-break-word">
              {reservation.user_email}
            </p>
          )}
          {reservation.tg_alias ? (
            <a
              className="link link-hover text-primary flex w-fit min-w-0 items-center gap-1.5"
              href={`https://t.me/${reservation.tg_alias.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="icon-[mdi--telegram] shrink-0 text-base" />
              <span className="wrap-break-word">
                @{reservation.tg_alias.replace(/^@/, "")}
              </span>
            </a>
          ) : (
            <span className="text-base-content/50 text-xs">
              Telegram not provided
            </span>
          )}
        </div>
      </div>

      <div className="border-base-300 bg-base-200/40 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-[material-symbols--event-outline] text-base-content/50 text-xl" />
          <div>
            <p className="text-base-content/50 text-xs">Return by</p>
            <p className="text-sm font-semibold">
              {formatReservationDate(reservation.return_date)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1.5"
          onClick={onView}
        >
          Manage
          <span className="icon-[material-symbols--arrow-forward] text-lg" />
        </button>
      </div>
    </article>
  );
}
function ReservationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @2xl/content:grid-cols-2">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="skeleton rounded-box h-60" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-base-300 text-base-content/60 border py-10 text-center">
      {message}
    </div>
  );
}

function QueryError({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="alert alert-error">
      <span className="icon-[material-symbols--error-outline] shrink-0 text-xl" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{formatApiErrorMessage(error)}</p>
      </div>
    </div>
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
