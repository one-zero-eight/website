import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  type SchemaBoardGameWithAvailability,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import { BoardGameImage } from "@/components/board-games/BoardGameImage.tsx";
import {
  boardGamesModalClassName,
  byCreatedAtDesc,
  GameDescription,
  GameInfoBody,
  ListState,
  ReservationStatusBadge,
  SearchInput,
  SkeletonGrid,
  telegramHandle,
  withId,
} from "@/components/board-games/shared.tsx";
import {
  getReservationValidationError,
  ReservationFormFields,
  UserReservationDetailsModal,
} from "@/components/board-games/UserReservationDetailsModal.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";

type BoardGame = SchemaBoardGameWithAvailability & { id: string };

export function BoardGamesPage() {
  // how=all includes returned reservations; the default list is only current ones.
  const reservationsQuery = $boardGames.useQuery(
    "get",
    "/users/me/reservations",
    { params: { query: { how: "all" } } },
  );
  const gamesQuery = $boardGames.useQuery("get", "/board-games");
  const games = withId(gamesQuery.data);
  const gameTitles = new Map(games.map((game) => [game.id, game.title]));
  const reservationsNewestFirst = byCreatedAtDesc(reservationsQuery.data ?? []);

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
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
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

      <ListState
        isPending={isPending}
        error={error}
        errorTitle="Could not load reservations"
        emptyMessage={
          reservations.length === 0
            ? "You have no reservations yet."
            : undefined
        }
        pending={
          <SkeletonGrid
            count={3}
            className="flex gap-3 overflow-hidden"
            itemClassName="h-44 w-[min(86cqw,22rem)] shrink-0"
          />
        }
      >
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
      </ListState>

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
  const telegram = telegramHandle(reservation.tg_alias);

  return (
    <article
      className="card card-border bg-base-100 hover:bg-base-200/60 w-[min(86cqw,22rem)] shrink-0 cursor-pointer snap-start transition-colors"
      onClick={onView}
    >
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="card-title truncate text-lg">
              {gameTitle ?? "Unknown game"}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-200">
              {new Date(reservation.created_at).toLocaleString()}
            </p>
          </div>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <div className="flex flex-col gap-2 text-sm text-neutral-500 dark:text-neutral-200">
          <div className="flex items-center gap-2">
            <span className="icon-[mdi--telegram] text-primary text-xl" />
            <span>{telegram ? `@${telegram}` : "Telegram not provided"}</span>
          </div>
          {reservation.return_date && (
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--event-outline] text-primary text-xl" />
              <span>
                Return by{" "}
                <span className="text-neutral-400">
                  {reservation.return_date}
                </span>
              </span>
            </div>
          )}
        </div>
        <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
          View information
          <span className="icon-[lucide--move-right] text-lg" />
        </span>
      </div>
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {normalizedSearchQuery
              ? `${filteredGames.length} of ${games.length} titles`
              : `${games.length} titles`}
          </p>
        )}
      </div>

      <SearchInput
        className="@md/content:max-w-md"
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder="Search games by name"
        disabled={isPending || Boolean(error)}
      />

      <ListState
        isPending={isPending}
        error={error}
        errorTitle="Could not load games"
        emptyMessage={
          games.length === 0
            ? "No games are available yet."
            : filteredGames.length === 0
              ? `No games match "${searchQuery.trim()}".`
              : undefined
        }
        pending={
          <SkeletonGrid
            count={6}
            className="grid grid-cols-1 gap-4 @md/content:grid-cols-2 @3xl/content:grid-cols-3"
            itemClassName="h-80"
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 @md/content:grid-cols-2 @3xl/content:grid-cols-3">
          {filteredGames.map((game) => (
            <CatalogueGameCard
              key={game.id}
              game={game}
              onView={() => setGameToView(game)}
              onReserve={() => setGameToReserve(game)}
            />
          ))}
        </div>
      </ListState>

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

function CatalogueGameCard({
  game,
  onView,
  onReserve,
}: {
  game: BoardGame;
  onView: () => void;
  onReserve: () => void;
}) {
  return (
    <article
      className="card card-border bg-base-100 min-w-0 cursor-pointer"
      onClick={onView}
    >
      <div className="relative flex h-45 items-center justify-center overflow-hidden rounded-t-(--radius-box)">
        <div
          className={cn(
            "absolute inset-0 bg-[url('/topography.svg')] bg-size-[1200px] bg-center bg-repeat",
            game.photo_file_id ? "opacity-20 blur-[2px]" : "opacity-30",
          )}
        />
        <BoardGameImage
          boardGameId={game.id}
          photoFileId={game.photo_file_id}
          className="rounded-field relative z-10 h-28 w-28 object-cover"
        />
      </div>
      <div className="card-body gap-2 p-4 pt-3">
        <h3 className="card-title text-xl wrap-anywhere">{game.title}</h3>
        <GameDescription
          description={game.description}
          className="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-200"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-200">
            <span className="text-base-content font-semibold tabular-nums">
              {game.available_copies}
            </span>
            <span className="text-neutral-400">
              {` of ${game.total_copies} available`}
            </span>
          </p>
          <button
            type="button"
            className="btn btn-primary btn-soft btn-sm text-nowrap"
            onClick={(event) => {
              event.stopPropagation();
              onReserve();
            }}
            disabled={game.available_copies < 1}
          >
            Reserve
            <span className="icon-[lucide--move-right] text-lg" />
          </button>
        </div>
      </div>
    </article>
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
    <Modal
      open
      onOpenChange={onOpenChange}
      title="Game information"
      containerClassName={boardGamesModalClassName}
    >
      <GameInfoBody
        image={
          <BoardGameImage
            boardGameId={game.id}
            photoFileId={game.photo_file_id}
            className="bg-base-300 rounded-box aspect-video w-full object-contain"
          />
        }
        title={game.title}
        description={game.description}
        stats={[
          { label: "Total copies", value: game.total_copies },
          {
            label: "Available",
            value: game.available_copies,
            accent: true,
          },
        ]}
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={onReserve}
            disabled={game.available_copies < 1}
          >
            Reserve game
          </button>
        }
      />
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
        tg_alias: telegramAlias.trim(),
        return_date: returnDate,
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
      containerClassName={boardGamesModalClassName}
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
  const httpCode =
    typeof error === "object" &&
    error !== null &&
    "httpCode" in error &&
    typeof error.httpCode === "number"
      ? error.httpCode
      : null;

  // 409 covers both "already reserved" and "no copies left"; the API uses one message for both.
  if (httpCode === 409) {
    return "This game cannot be reserved right now. You may already have an active reservation, or no copies may be available.";
  }
  if (httpCode === 404) {
    return "This game is no longer available. Refresh the page and choose another game.";
  }

  return formatApiErrorMessage(error);
}
