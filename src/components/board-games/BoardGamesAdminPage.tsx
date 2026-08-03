import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaBoardGameWithStorageAvailability,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormEvent, useRef, useState } from "react";

type Reservation = SchemaReservation;
type BoardGame = SchemaBoardGameWithStorageAvailability;

const activeStatuses: ReservationStatus[] = [
  ReservationStatus.reserved,
  ReservationStatus.taken,
];
const boardGamePlaceholderImage = "/board-games/placeholder.png";

export function BoardGamesAdminPage() {
  const reservationsQuery = $boardGames.useQuery("get", "/admin/reservations");
  const gamesQuery = $boardGames.useQuery("get", "/admin/board-games");
  const activeReservations = (reservationsQuery.data ?? []).filter(
    (reservation) => activeStatuses.includes(reservation.status),
  );
  const gameTitles = new Map(
    (gamesQuery.data ?? []).map((game) => [game.id, game.title]),
  );

  return (
    <main className="@container/content mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 @md/content:p-6">
      <ReservationsSection
        reservations={activeReservations}
        gameTitles={gameTitles}
        isPending={reservationsQuery.isPending}
        error={reservationsQuery.error}
      />
      <GamesInventorySection
        games={gamesQuery.data ?? []}
        isPending={gamesQuery.isPending}
        error={gamesQuery.error}
      />
    </main>
  );
}

function ReservationsSection({
  reservations,
  gameTitles,
  isPending,
  error,
}: {
  reservations: Reservation[];
  gameTitles: Map<string, string>;
  isPending: boolean;
  error: unknown;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [reservationToView, setReservationToView] =
    useState<Reservation | null>(null);
  const [reservationToTake, setReservationToTake] =
    useState<Reservation | null>(null);

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
          <h1 className="text-2xl font-semibold">Current reservations</h1>
          {!isPending && !error && (
            <p className="text-base-content/60 text-sm">
              {reservations.length} active
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/board-games/admin/reservations"
            className="btn btn-ghost btn-sm"
          >
            View all
            <span className="icon-[material-symbols--arrow-forward] text-lg" />
          </Link>
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
              className="skeleton h-52 w-[min(86cqw,22rem)] shrink-0"
            />
          ))}
        </div>
      )}

      {Boolean(error) && (
        <QueryError title="Could not load reservations" error={error} />
      )}

      {!isPending && !error && reservations.length === 0 && (
        <div className="border-base-300 text-base-content/60 flex min-h-40 items-center justify-center border py-8 text-center">
          There are no active reservations.
        </div>
      )}

      {!isPending && !error && reservations.length > 0 && (
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              gameTitle={gameTitles.get(reservation.board_game_id)}
              onView={() => setReservationToView(reservation)}
              onTake={() => setReservationToTake(reservation)}
            />
          ))}
        </div>
      )}

      <BorrowerNameModal
        reservation={reservationToTake}
        onOpenChange={(open) => !open && setReservationToTake(null)}
      />
      {reservationToView && (
        <ReservationDetailsModal
          reservation={reservationToView}
          onOpenChange={(open) => !open && setReservationToView(null)}
        />
      )}
    </section>
  );
}

function ReservationCard({
  reservation,
  gameTitle,
  onView,
  onTake,
}: {
  reservation: Reservation;
  gameTitle?: string;
  onView: () => void;
  onTake: () => void;
}) {
  const { updateStatus, isPending } = useReservationStatusMutation();
  const isReserved = reservation.status === ReservationStatus.reserved;

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
        <span
          className={cn(
            "badge shrink-0 capitalize",
            isReserved ? "badge-warning" : "badge-info",
          )}
        >
          {reservation.status}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="icon-[mdi--telegram] text-primary text-xl" />
          {reservation.tg_alias ? (
            <a
              className="link link-hover font-medium"
              href={`https://t.me/${reservation.tg_alias.replace(/^@/, "")}`}
              onClick={(event) => event.stopPropagation()}
            >
              @{reservation.tg_alias.replace(/^@/, "")}
            </a>
          ) : (
            <span className="text-base-content/50">Telegram not provided</span>
          )}
        </div>
        {!isReserved && reservation.borrower_name && (
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--person-outline] text-xl" />
            <span>{reservation.borrower_name}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className={cn(
          "btn mt-auto",
          isReserved ? "btn-primary" : "btn-success",
        )}
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          if (isReserved) {
            onTake();
            return;
          }
          updateStatus(
            reservation.id,
            ReservationStatus.returned,
            reservation.borrower_name,
          );
        }}
      >
        {isPending && <span className="loading loading-spinner loading-sm" />}
        {isReserved ? "Mark as taken" : "Mark as returned"}
      </button>
    </article>
  );
}

function ReservationDetailsModal({
  reservation,
  onOpenChange,
}: {
  reservation: Reservation;
  onOpenChange: (open: boolean) => void;
}) {
  const isReserved = reservation.status === ReservationStatus.reserved;

  return (
    <Modal open onOpenChange={onOpenChange} title="Reservation information">
      <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-2">
        <GameInformationField label="User email">
          {reservation.user_email}
        </GameInformationField>
        <GameInformationField label="Status">
          <span
            className={cn(
              "badge capitalize",
              isReserved ? "badge-warning" : "badge-info",
            )}
          >
            {reservation.status}
          </span>
        </GameInformationField>
        <GameInformationField label="Telegram alias">
          {reservation.tg_alias ? (
            <a
              href={`https://t.me/${reservation.tg_alias.replace(/^@/, "")}`}
              className="link link-hover"
              target="_blank"
              rel="noreferrer"
            >
              @{reservation.tg_alias.replace(/^@/, "")}
            </a>
          ) : (
            "Not provided"
          )}
        </GameInformationField>
        <GameInformationField label="Return date">
          {reservation.return_date || "Not provided"}
        </GameInformationField>
        <GameInformationField
          label="When available"
          className="@sm/modal:col-span-2"
        >
          {reservation.when_available || "Not provided"}
        </GameInformationField>
        <GameInformationField label="Comments" className="@sm/modal:col-span-2">
          {reservation.comments || "Not provided"}
        </GameInformationField>
        <GameInformationField label="Borrower name">
          {reservation.borrower_name || "Not provided"}
        </GameInformationField>
        <GameInformationField label="Created at">
          {new Date(reservation.created_at).toLocaleString()}
        </GameInformationField>
      </div>
    </Modal>
  );
}

function BorrowerNameModal({
  reservation,
  onOpenChange,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [borrowerName, setBorrowerName] = useState("");
  const { updateStatus, isPending } = useReservationStatusMutation(() => {
    setBorrowerName("");
    onOpenChange(false);
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reservation || !borrowerName.trim()) return;
    updateStatus(reservation.id, ReservationStatus.taken, borrowerName.trim());
  }

  return (
    <Modal
      open={reservation !== null}
      onOpenChange={onOpenChange}
      title="Confirm borrower"
      closeOnOutsidePress={!isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="fieldset">
          <span className="fieldset-legend">Borrower name</span>
          <input
            className="input w-full"
            value={borrowerName}
            onChange={(event) => setBorrowerName(event.target.value)}
            placeholder="Full name"
            autoFocus
            required
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !borrowerName.trim()}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Mark as taken
          </button>
        </div>
      </form>
    </Modal>
  );
}

function useReservationStatusMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const mutation = $boardGames.useMutation(
    "patch",
    "/admin/reservations/{id}/status",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $boardGames.queryOptions("get", "/admin/reservations")
            .queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $boardGames.queryOptions("get", "/admin/board-games")
            .queryKey,
        });
        showSuccess("Reservation updated", "The new status has been saved.");
        onSuccess?.();
      },
      onError: (error) => {
        showError("Could not update reservation", formatApiErrorMessage(error));
      },
    },
  );

  function updateStatus(
    reservationId: string,
    status: ReservationStatus,
    borrowerName: string | null,
  ) {
    mutation.mutate({
      params: { path: { id: reservationId } },
      body: { status, borrower_name: borrowerName },
    });
  }

  return { updateStatus, isPending: mutation.isPending };
}

function GamesInventorySection({
  games,
  isPending,
  error,
}: {
  games: SchemaBoardGameWithStorageAvailability[];
  isPending: boolean;
  error: unknown;
}) {
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [gameToView, setGameToView] = useState<BoardGame | null>(null);
  const [gameToEdit, setGameToEdit] = useState<BoardGame | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredGames = games.filter((game) =>
    game.title.toLocaleLowerCase().includes(normalizedSearchQuery),
  );
  const deleteMutation = $boardGames.useMutation(
    "delete",
    "/admin/board-games/{id}",
  );
  const deletingGameId = deleteMutation.isPending
    ? deleteMutation.variables?.params.path.id
    : null;

  async function handleDeleteGame(game: BoardGame) {
    const confirmed = await showConfirm({
      title: "Delete board game",
      message: `Delete ${game.title} from the inventory? This action cannot be undone.`,
      confirmText: "Delete game",
      type: "error",
    });
    if (!confirmed) return;

    deleteMutation.mutate(
      { params: { path: { id: game.id } } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: $boardGames.queryOptions("get", "/admin/board-games")
              .queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: $boardGames.queryOptions("get", "/admin/reservations")
              .queryKey,
          });
          if (gameToEdit?.id === game.id) setGameToEdit(null);
          showSuccess("Game deleted", `${game.title} has been removed.`);
        },
        onError: (error) => {
          showError("Could not delete game", formatApiErrorMessage(error));
        },
      },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Games in storage</h2>
          {!isPending && !error && (
            <p className="text-base-content/60 text-sm">
              {normalizedSearchQuery
                ? `${filteredGames.length} of ${games.length} titles`
                : `${games.length} titles`}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={() => setIsAddGameModalOpen(true)}
        >
          <span className="icon-[material-symbols--add] text-xl" />
          Add game
        </button>
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
            <div key={item} className="skeleton h-24" />
          ))}
        </div>
      )}
      {Boolean(error) && (
        <QueryError title="Could not load games" error={error} />
      )}
      {!isPending && !error && games.length === 0 && (
        <div className="border-base-300 text-base-content/60 border py-8 text-center">
          No games have been added yet.
        </div>
      )}
      {!isPending &&
        !error &&
        games.length > 0 &&
        filteredGames.length === 0 && (
          <div className="border-base-300 text-base-content/60 border py-8 text-center">
            No games match &quot;{searchQuery.trim()}&quot;.
          </div>
        )}
      {!isPending && !error && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 gap-3 @md/content:grid-cols-2 @3xl/content:grid-cols-3">
          {filteredGames.map((game) => (
            <article
              key={game.id}
              className="border-base-300 bg-base-100 hover:bg-base-200/50 flex cursor-pointer items-center gap-3 border p-3 transition-colors"
              onClick={() => setGameToView(game)}
            >
              <img
                src={game.photo_url || boardGamePlaceholderImage}
                alt=""
                className="bg-base-200 h-16 w-16 shrink-0 object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = boardGamePlaceholderImage;
                }}
              />
              <div className="min-w-0 grow">
                <h3 className="truncate font-semibold">{game.title}</h3>
                <p className="text-base-content/60 text-sm">
                  Available in storage
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-primary min-w-8 text-center text-2xl font-semibold tabular-nums">
                  {game.available_in_storage}
                </span>
                <button
                  type="button"
                  className="btn btn-square btn-ghost btn-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGameToEdit(game);
                  }}
                  title={`Edit ${game.title}`}
                  disabled={deletingGameId === game.id}
                >
                  <span className="icon-[material-symbols--edit-outline] text-xl" />
                </button>
                <button
                  type="button"
                  className="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteGame(game);
                  }}
                  title={`Delete ${game.title}`}
                  disabled={deleteMutation.isPending}
                >
                  {deletingGameId === game.id ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <span className="icon-[material-symbols--delete-outline] text-xl" />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <BoardGameFormModal
        open={isAddGameModalOpen}
        onOpenChange={setIsAddGameModalOpen}
      />
      {gameToView && (
        <BoardGameDetailsModal
          game={gameToView}
          onOpenChange={(open) => !open && setGameToView(null)}
        />
      )}
      {gameToEdit && (
        <BoardGameFormModal
          key={gameToEdit.id}
          open
          onOpenChange={(open) => !open && setGameToEdit(null)}
          game={gameToEdit}
        />
      )}
    </section>
  );
}

function BoardGameDetailsModal({
  game,
  onOpenChange,
}: {
  game: BoardGame;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open onOpenChange={onOpenChange} title="Game information">
      <div className="flex flex-col gap-4">
        <img
          src={game.photo_url || boardGamePlaceholderImage}
          alt=""
          className="bg-base-300 aspect-video w-full object-contain"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = boardGamePlaceholderImage;
          }}
        />

        <div className="grid grid-cols-1 gap-3 @sm/modal:grid-cols-2">
          <GameInformationField label="Title" className="@sm/modal:col-span-2">
            {game.title}
          </GameInformationField>
          <GameInformationField
            label="Description"
            className="@sm/modal:col-span-2"
          >
            {game.description || "Not provided"}
          </GameInformationField>
          <GameInformationField
            label="Photo URL"
            className="@sm/modal:col-span-2"
          >
            {game.photo_url ? (
              <a
                href={game.photo_url}
                className="link link-hover block truncate"
                target="_blank"
                rel="noreferrer"
              >
                {game.photo_url}
              </a>
            ) : (
              "Not provided"
            )}
          </GameInformationField>
          <GameInformationField label="Total copies">
            {game.total_copies}
          </GameInformationField>
          <GameInformationField label="Available copies">
            {game.available_copies}
          </GameInformationField>
          <GameInformationField label="Available in storage">
            {game.available_in_storage}
          </GameInformationField>
        </div>
        <div className="flex justify-end">
          <Link
            to="/board-games/admin/reservations"
            search={{ gameId: game.id }}
            className="btn btn-primary"
          >
            View reservations
            <span className="icon-[material-symbols--arrow-forward] text-xl" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}

function GameInformationField({
  label,
  className,
  children,
}: React.PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-base-content/60 text-xs font-semibold uppercase">
        {label}
      </p>
      <div className="wrap-break-word">{children}</div>
    </div>
  );
}

function BoardGameFormModal({
  open,
  onOpenChange,
  game,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: BoardGame;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [title, setTitle] = useState(game?.title ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [photoUrl, setPhotoUrl] = useState(game?.photo_url ?? "");
  const [totalCopies, setTotalCopies] = useState(
    game?.total_copies.toString() ?? "1",
  );
  const isEditing = Boolean(game);

  function resetForm() {
    setTitle(game?.title ?? "");
    setDescription(game?.description ?? "");
    setPhotoUrl(game?.photo_url ?? "");
    setTotalCopies(game?.total_copies.toString() ?? "1");
  }

  function handleMutationSuccess() {
    queryClient.invalidateQueries({
      queryKey: $boardGames.queryOptions("get", "/admin/board-games").queryKey,
    });
    showSuccess(
      isEditing ? "Game updated" : "Game added",
      isEditing
        ? `${title.trim()} has been updated.`
        : `${title.trim()} is now in the inventory.`,
    );
    resetForm();
    onOpenChange(false);
  }

  function handleMutationError(error: unknown) {
    showError(
      isEditing ? "Could not update game" : "Could not add game",
      formatApiErrorMessage(error),
    );
  }

  const createMutation = $boardGames.useMutation("post", "/admin/board-games", {
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });
  const editMutation = $boardGames.useMutation(
    "patch",
    "/admin/board-games/{id}",
    {
      onSuccess: handleMutationSuccess,
      onError: handleMutationError,
    },
  );
  const isMutationPending = createMutation.isPending || editMutation.isPending;

  function handleOpenChange(nextOpen: boolean) {
    if (isMutationPending) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedTotalCopies = Number(totalCopies);
    if (
      !title.trim() ||
      !Number.isInteger(parsedTotalCopies) ||
      parsedTotalCopies < 1
    ) {
      return;
    }

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      photo_url: photoUrl.trim() || null,
      total_copies: parsedTotalCopies,
    };

    if (game) {
      editMutation.mutate({
        params: { path: { id: game.id } },
        body,
      });
      return;
    }

    createMutation.mutate({ body });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit board game" : "Add board game"}
      closeOnOutsidePress={!isMutationPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="fieldset">
          <span className="fieldset-legend">Title</span>
          <input
            type="text"
            className="input w-full"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Catan"
            disabled={isMutationPending}
            autoFocus
            required
          />
        </label>

        <label className="fieldset">
          <span className="fieldset-legend">Description</span>
          <textarea
            className="textarea min-h-24 w-full resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short game description"
            disabled={isMutationPending}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 @sm/modal:grid-cols-[1fr_8rem]">
          <label className="fieldset min-w-0">
            <span className="fieldset-legend">Image URL</span>
            <input
              type="url"
              className="input w-full"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://example.com/game.jpg"
              disabled={isMutationPending}
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend">Total copies</span>
            <input
              type="number"
              className="input w-full"
              value={totalCopies}
              onChange={(event) => setTotalCopies(event.target.value)}
              min="1"
              step="1"
              inputMode="numeric"
              disabled={isMutationPending}
              required
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isMutationPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isMutationPending || !title.trim()}
          >
            {isMutationPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {isEditing ? "Save changes" : "Add game"}
          </button>
        </div>
      </form>
    </Modal>
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
