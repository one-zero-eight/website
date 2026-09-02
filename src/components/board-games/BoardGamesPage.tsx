import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaBoardGameWithAvailability,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { BoardGameImage } from "@/components/board-games/BoardGameImage.tsx";
import {
  getReservationValidationError,
  ReservationFormFields,
  UserReservationDetailsModal,
} from "@/components/board-games/UserReservationDetailsModal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";

type BoardGame = SchemaBoardGameWithAvailability & { id: string };

export function BoardGamesPage() {
  const reservationsQuery = $boardGames.useQuery(
    "get",
    "/users/me/reservations",
    { params: { query: { how: "all" } } },
  );
  const gamesQuery = $boardGames.useQuery("get", "/board-games");
  const games = (gamesQuery.data ?? []).filter((game): game is BoardGame =>
    Boolean(game.id),
  );
  const gameTitles = new Map(games.map((game) => [game.id, game.title]));
  const reservationsNewestFirst = [...(reservationsQuery.data ?? [])].sort(
    (firstReservation, secondReservation) =>
      new Date(secondReservation.created_at).getTime() -
      new Date(firstReservation.created_at).getTime(),
  );

  return (
    <main className="@container/content mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 @md/content:p-6">
      <UserReservationsSection
        reservations={reservationsNewestFirst}
        gameTitles={gameTitles}
        isPending={reservationsQuery.isPending}
        error={reservationsQuery.error}
      />
      <GamesCatalogueSection
        games={games}
        isPending={gamesQuery.isPending}
        error={gamesQuery.error}
      />
    </main>
  );
}

function UserReservationsSection({
  reservations,
  gameTitles,
  isPending,
  error,
}: {
  reservations: SchemaReservation[];
  gameTitles: Map<string, string>;
  isPending: boolean;
  error: unknown;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [reservationToView, setReservationToView] =
    useState<SchemaReservation | null>(null);

  function handleScroll(direction: -1 | 1) {
    carouselRef.current?.scrollBy({
      left: direction * carouselRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your reservations</h1>
          {!isPending && !error && (
            <p className="text-base-content/60 text-sm">
              {reservations.length} total
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn btn-square btn-ghost"
            onClick={() => handleScroll(-1)}
            disabled={reservations.length < 2}
            title="Previous reservations"
          >
            <span className="icon-[material-symbols--chevron-left] text-2xl" />
          </button>
          <button
            type="button"
            className="btn btn-square btn-ghost"
            onClick={() => handleScroll(1)}
            disabled={reservations.length < 2}
            title="Next reservations"
          >
            <span className="icon-[material-symbols--chevron-right] text-2xl" />
          </button>
        </div>
      </div>

      {isPending && (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="skeleton h-44 w-[min(86cqw,22rem)] shrink-0"
            />
          ))}
        </div>
      )}
      {Boolean(error) && (
        <QueryError title="Could not load reservations" error={error} />
      )}
      {!isPending && !error && reservations.length === 0 && (
        <EmptyState message="You have no reservations yet." />
      )}
      {!isPending && !error && reservations.length > 0 && (
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {reservations.map((reservation) => (
            <UserReservationCard
              key={reservation.id}
              reservation={reservation}
              gameTitle={gameTitles.get(reservation.board_game_id)}
              onView={() => setReservationToView(reservation)}
            />
          ))}
        </div>
      )}

      {reservationToView && (
        <UserReservationDetailsModal
          reservation={reservationToView}
          gameTitle={gameTitles.get(reservationToView.board_game_id)}
          onOpenChange={(open) => !open && setReservationToView(null)}
        />
      )}
    </section>
  );
}

function UserReservationCard({
  reservation,
  gameTitle,
  onView,
}: {
  reservation: SchemaReservation;
  gameTitle?: string;
  onView: () => void;
}) {
  return (
    <article
      className="border-base-300 bg-base-100 hover:bg-base-200/50 flex w-[min(86cqw,22rem)] shrink-0 cursor-pointer snap-start flex-col gap-4 border p-4 transition-colors"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {gameTitle ?? "Unknown game"}
          </h2>
          <p className="text-base-content/60 text-sm">
            {new Date(reservation.created_at).toLocaleString()}
          </p>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="icon-[mdi--telegram] text-primary text-xl" />
          <span>
            {reservation.tg_alias
              ? `@${reservation.tg_alias.replace(/^@/, "")}`
              : "Telegram not provided"}
          </span>
        </div>
        {reservation.return_date && (
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--event-outline] text-xl" />
            <span>Return by {reservation.return_date}</span>
          </div>
        )}
      </div>
      <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
        View information
        <span className="icon-[material-symbols--arrow-forward] text-lg" />
      </span>
    </article>
  );
}

function GamesCatalogueSection({
  games,
  isPending,
  error,
}: {
  games: BoardGame[];
  isPending: boolean;
  error: unknown;
}) {
  const [gameToReserve, setGameToReserve] = useState<BoardGame | null>(null);
  const [gameToView, setGameToView] = useState<BoardGame | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredGames = games.filter((game) =>
    game.title.toLocaleLowerCase().includes(normalizedSearchQuery),
  );

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-2xl font-semibold">All games</h2>
        {!isPending && !error && (
          <p className="text-base-content/60 text-sm">
            {normalizedSearchQuery
              ? `${filteredGames.length} of ${games.length} titles`
              : `${games.length} titles`}
          </p>
        )}
      </div>

      <label className="input w-full @md/content:max-w-md">
        <span className="icon-[material-symbols--search] text-base-content/50 shrink-0 text-xl" />
        <input
          type="search"
          className="grow"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search games by name"
          disabled={isPending || Boolean(error)}
        />
      </label>

      {isPending && (
        <div className="grid grid-cols-1 gap-3 @md/content:grid-cols-2 @3xl/content:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="skeleton h-44" />
          ))}
        </div>
      )}
      {Boolean(error) && (
        <QueryError title="Could not load games" error={error} />
      )}
      {!isPending && !error && games.length === 0 && (
        <EmptyState message="No games are available yet." />
      )}
      {!isPending &&
        !error &&
        games.length > 0 &&
        filteredGames.length === 0 && (
          <EmptyState message={`No games match "${searchQuery.trim()}".`} />
        )}
      {!isPending && !error && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 gap-3 @md/content:grid-cols-2 @3xl/content:grid-cols-3">
          {filteredGames.map((game) => (
            <article
              key={game.id}
              className="border-base-300 bg-base-100 hover:bg-base-200/50 flex min-w-0 cursor-pointer flex-col gap-3 border p-3 transition-colors"
              onClick={() => setGameToView(game)}
            >
              <div className="flex min-w-0 gap-3">
                <BoardGameImage
                  boardGameId={game.id}
                  photoFileId={game.photo_file_id}
                  className="h-20 w-20 shrink-0 object-cover"
                />
                <div className="min-w-0 grow">
                  <h3 className="truncate font-semibold">{game.title}</h3>
                  <p className="text-base-content/60 line-clamp-2 text-sm">
                    {game.description || "No description provided."}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="text-lg font-semibold tabular-nums">
                    {game.available_copies}
                  </span>
                  <span className="text-base-content/60">
                    {` of ${game.total_copies} available`}
                  </span>
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGameToReserve(game);
                  }}
                  disabled={game.available_copies < 1}
                >
                  Reserve
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {gameToView && (
        <UserGameDetailsModal
          game={gameToView}
          onOpenChange={(open) => !open && setGameToView(null)}
          onReserve={() => {
            setGameToView(null);
            setGameToReserve(gameToView);
          }}
        />
      )}
      {gameToReserve && (
        <MakeReservationModal
          game={gameToReserve}
          onOpenChange={(open) => !open && setGameToReserve(null)}
        />
      )}
    </section>
  );
}

function UserGameDetailsModal({
  game,
  onOpenChange,
  onReserve,
}: {
  game: BoardGame;
  onOpenChange: (open: boolean) => void;
  onReserve: () => void;
}) {
  return (
    <Modal open onOpenChange={onOpenChange} title="Game information">
      <div className="flex flex-col gap-4">
        <BoardGameImage
          boardGameId={game.id}
          photoFileId={game.photo_file_id}
          className="bg-base-300 aspect-video w-full object-contain"
        />
        <div>
          <h2 className="text-xl font-semibold wrap-break-word">
            {game.title}
          </h2>
          <p className="text-base-content/75 mt-2 whitespace-pre-wrap">
            {game.description || "No description provided."}
          </p>
        </div>
        <div className="border-base-300 grid grid-cols-2 gap-3 border-y py-3">
          <div>
            <p className="text-base-content/60 text-xs font-semibold uppercase">
              Total copies
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {game.total_copies}
            </p>
          </div>
          <div>
            <p className="text-base-content/60 text-xs font-semibold uppercase">
              Available copies
            </p>
            <p className="text-primary text-lg font-semibold tabular-nums">
              {game.available_copies}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onReserve}
            disabled={game.available_copies < 1}
          >
            Reserve game
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MakeReservationModal({
  game,
  onOpenChange,
}: {
  game: BoardGame;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [telegramAlias, setTelegramAlias] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [whenAvailable, setWhenAvailable] = useState("");
  const [comments, setComments] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const validationError = hasAttemptedSubmit
    ? getReservationValidationError(telegramAlias, returnDate)
    : null;
  const mutation = $boardGames.useMutation(
    "post",
    "/board-games/{id}/reservations",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $boardGames.queryOptions("get", "/users/me/reservations")
            .queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $boardGames.queryOptions("get", "/board-games").queryKey,
        });
        showSuccess("Game reserved", `${game.title} has been reserved.`);
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Could not reserve game", formatReservationError(error));
      },
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (getReservationValidationError(telegramAlias, returnDate)) return;
    mutation.mutate({
      params: { path: { id: game.id } },
      body: {
        tg_alias: telegramAlias.trim() || null,
        return_date: returnDate || null,
        when_available: whenAvailable.trim() || null,
        comments: comments.trim() || null,
      },
    });
  }

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={`Reserve ${game.title}`}
      closeOnOutsidePress={!mutation.isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <ReservationFormFields
          telegramAlias={telegramAlias}
          onTelegramAliasChange={setTelegramAlias}
          returnDate={returnDate}
          onReturnDateChange={setReturnDate}
          whenAvailable={whenAvailable}
          onWhenAvailableChange={setWhenAvailable}
          comments={comments}
          onCommentsChange={setComments}
          disabled={mutation.isPending}
          validationError={validationError}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Reserve game
          </button>
        </div>
      </form>
    </Modal>
  );
}

function formatReservationError(error: unknown) {
  if (typeof error !== "object" || error === null || !("httpCode" in error)) {
    return formatApiErrorMessage(error);
  }

  const apiError = error as { body?: unknown; httpCode: number };
  const detail = (apiError.body as { detail?: unknown } | undefined)?.detail;
  const detailMessage = typeof detail === "string" ? detail.toLowerCase() : "";

  if (
    apiError.httpCode === 409 &&
    (detailMessage.includes("already") || detailMessage.includes("duplicate"))
  ) {
    return "You already have an active reservation for this game.";
  }
  if (apiError.httpCode === 409) {
    return "This game cannot be reserved right now. You may already have an active reservation, or no copies may be available.";
  }
  if (apiError.httpCode === 404) {
    return "This game is no longer available in the catalogue. Refresh the page and choose another game.";
  }
  if (apiError.httpCode === 401) {
    return "Your session has expired. Sign in again and retry the reservation.";
  }

  return formatApiErrorMessage(error);
}

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={cn(
        "badge shrink-0 capitalize",
        status === ReservationStatus.reserved && "badge-warning",
        status === ReservationStatus.taken && "badge-info",
        status === ReservationStatus.returned && "badge-success",
      )}
    >
      {status}
    </span>
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
