import { ReservationOverdueTag } from "./ReservationOverdueTag.tsx";
import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaBoardGameOut,
  type SchemaBoardGameWithStorageAvailabilityOut,
  type SchemaReservationOut,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { ReservationDetailsModal } from "./ReservationDetailsModal";
import { BoardGameImage } from "@/components/board-games/BoardGameImage.tsx";
import { GameInformationField } from "@/components/board-games/GameInformationField.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormEvent, useRef, useState } from "react";
import {
  isReservationOverdue,
  prioritizeOverdueReservations,
} from "./reservation-presentation";

type Reservation = SchemaReservationOut & { id: string };
type BoardGame = SchemaBoardGameWithStorageAvailabilityOut & { id: string };

const activeStatuses: ReservationStatus[] = [
  ReservationStatus.reserved,
  ReservationStatus.taken,
];

export function BoardGamesAdminPage() {
  const reservationsQuery = $boardGames.useQuery("get", "/admin/reservations");
  const gamesQuery = $boardGames.useQuery("get", "/admin/board-games");
  const reservations = (reservationsQuery.data ?? []).filter(
    (reservation): reservation is Reservation => Boolean(reservation.id),
  );
  const games = (gamesQuery.data ?? []).filter((game): game is BoardGame =>
    Boolean(game.id),
  );
  const activeReservations = reservations.filter((reservation) =>
    activeStatuses.includes(reservation.status),
  );
  const gameTitles = new Map(games.map((game) => [game.id, game.title]));

  return (
    <main className="@container/content mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 @md/content:p-6">
      <ReservationsSection
        reservations={prioritizeOverdueReservations(activeReservations)}
        gameTitles={gameTitles}
        isPending={reservationsQuery.isPending}
        error={reservationsQuery.error}
      />
      <GamesInventorySection
        games={games}
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
  const [reservationToEdit, setReservationToEdit] =
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
        <ReservationInformationModal
          reservation={reservationToView}
          onEdit={() => {
            setReservationToEdit(reservationToView);
            setReservationToView(null);
          }}
          onOpenChange={(open) => !open && setReservationToView(null)}
        />
      )}
      {reservationToEdit && (
        <ReservationDetailsModal
          reservation={reservationToEdit}
          gameTitle={gameTitles.get(reservationToEdit.board_game_id)}
          onOpenChange={(open) => !open && setReservationToEdit(null)}
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
      className={cn(
        "bg-base-100 flex w-[min(86cqw,22rem)] shrink-0 cursor-pointer snap-start flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-colors",
        isReservationOverdue(reservation)
          ? "border-error/50 hover:border-error/75 bg-error/5 hover:bg-error/10"
          : "border-base-300/70 hover:border-base-300 hover:bg-base-200/50",
      )}
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
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              "badge shrink-0 capitalize",
              isReserved ? "badge-warning" : "badge-info",
            )}
          >
            {reservation.status}
          </span>
          <ReservationOverdueTag reservation={reservation} />
        </div>
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

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          className={cn("btn", isReserved ? "btn-primary" : "btn-success")}
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
      </div>
    </article>
  );
}

function ReservationInformationModal({
  reservation,
  onEdit,
  onOpenChange,
}: {
  reservation: Reservation;
  onEdit: () => void;
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
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "badge capitalize",
                isReserved ? "badge-warning" : "badge-info",
              )}
            >
              {reservation.status}
            </span>
            <ReservationOverdueTag reservation={reservation} />
          </div>
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
        {reservation.when_available?.trim() && (
          <GameInformationField
            label="When available"
            className="@sm/modal:col-span-2"
          >
            {reservation.when_available}
          </GameInformationField>
        )}
        {reservation.comments?.trim() && (
          <GameInformationField
            label="Comments"
            className="@sm/modal:col-span-2"
          >
            {reservation.comments}
          </GameInformationField>
        )}
        <GameInformationField label="Borrower name">
          {reservation.borrower_name || "Not provided"}
        </GameInformationField>
        <GameInformationField label="Created at">
          {new Date(reservation.created_at).toLocaleString()}
        </GameInformationField>
      </div>
      <div className="border-base-300 mt-2 flex justify-end border-t pt-4">
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          <span className="icon-[material-symbols--edit-outline] text-xl" />
          Edit reservation
        </button>
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
    "/admin/reservations/{id}",
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
  games: BoardGame[];
  isPending: boolean;
  error: unknown;
}) {
  const queryClient = useQueryClient();
  const { showConfirm, showError, showSuccess } = useToast();
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [gameToView, setGameToView] = useState<BoardGame | null>(null);
  const [gameToEdit, setGameToEdit] = useState<BoardGame | null>(null);
  const viewedGame = games.find((game) => game.id === gameToView?.id);
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
              className="border-base-300 bg-base-100 hover:bg-base-200/50 flex min-w-0 cursor-pointer flex-col gap-3 border p-3 transition-colors"
              onClick={() => setGameToView(game)}
            >
              <div className="flex min-w-0 gap-3">
                <BoardGameImage
                  boardGameId={game.id}
                  hasPhoto={game.has_photo}
                  className="h-20 w-20 shrink-0 object-cover"
                />
                <div className="min-w-0 grow">
                  <h3 className="truncate font-semibold">{game.title}</h3>
                  <p className="text-base-content/60 line-clamp-3 text-sm whitespace-pre-wrap">
                    {game.description}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="text-lg font-semibold tabular-nums">
                    {game.available_in_storage}
                  </span>
                  <span className="text-base-content/60">
                    {` of ${game.total_copies} available`}
                  </span>
                </p>
                <div className="flex shrink-0 items-center gap-1">
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
              </div>
            </article>
          ))}
        </div>
      )}
      <BoardGameFormModal
        open={isAddGameModalOpen}
        onOpenChange={setIsAddGameModalOpen}
      />
      {viewedGame && (
        <BoardGameDetailsModal
          game={viewedGame}
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
        <BoardGameImage
          boardGameId={game.id}
          hasPhoto={game.has_photo}
          className="mx-auto aspect-square w-full max-w-xs object-contain"
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [totalCopies, setTotalCopies] = useState(
    game?.total_copies.toString() ?? "1",
  );
  const isEditing = Boolean(game);

  function resetForm() {
    setTitle(game?.title ?? "");
    setDescription(game?.description ?? "");
    setPhotoFile(null);
    setPhotoPreview(null);
    setTotalCopies(game?.total_copies.toString() ?? "1");
  }

  async function handleMutationSuccess(savedGame: SchemaBoardGameOut) {
    const adminGamesQueryKey = $boardGames.queryOptions(
      "get",
      "/admin/board-games",
    ).queryKey;
    const gamesQueryKey = $boardGames.queryOptions(
      "get",
      "/board-games",
    ).queryKey;

    await Promise.all([
      queryClient.cancelQueries({ queryKey: adminGamesQueryKey }),
      queryClient.cancelQueries({ queryKey: gamesQueryKey }),
    ]);

    queryClient.setQueryData(adminGamesQueryKey, (games) =>
      games?.map((game) =>
        game.id === savedGame.id ? { ...game, ...savedGame } : game,
      ),
    );
    queryClient.setQueryData(gamesQueryKey, (games) =>
      games?.map((game) =>
        game.id === savedGame.id ? { ...game, ...savedGame } : game,
      ),
    );
    queryClient.invalidateQueries({
      queryKey: adminGamesQueryKey,
    });
    queryClient.invalidateQueries({ queryKey: gamesQueryKey });
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

  const createMutation = $boardGames.useMutation("post", "/admin/board-games");
  const editMutation = $boardGames.useMutation(
    "patch",
    "/admin/board-games/{id}",
  );
  const photoMutation = $boardGames.useMutation(
    "post",
    "/admin/board-games/{id}/photo",
  );
  const isMutationPending =
    createMutation.isPending ||
    editMutation.isPending ||
    photoMutation.isPending;

  function handleOpenChange(nextOpen: boolean) {
    if (isMutationPending) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    if (!file) {
      setPhotoPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      total_copies: parsedTotalCopies,
    };

    try {
      let savedGame = game
        ? await editMutation.mutateAsync({
            params: { path: { id: game.id } },
            body,
          })
        : await createMutation.mutateAsync({ body });

      if (photoFile && savedGame.id) {
        const formData = new FormData();
        formData.append("photo_file", photoFile);
        savedGame = await photoMutation.mutateAsync({
          params: { path: { id: savedGame.id } },
          body: formData as never,
        });
      }

      await handleMutationSuccess(savedGame);
    } catch (error) {
      handleMutationError(error);
    }
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
            <span className="fieldset-legend">
              {isEditing ? "Replace photo" : "Photo"}
            </span>
            <input
              type="file"
              className="file-input w-full"
              accept="image/*"
              onChange={(event) =>
                handlePhotoChange(event.target.files?.[0] ?? null)
              }
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

        {photoPreview ? (
          <img
            src={photoPreview}
            alt=""
            className="bg-base-200 aspect-video w-full object-contain"
          />
        ) : (
          game?.id && (
            <BoardGameImage
              boardGameId={game.id}
              hasPhoto={game.has_photo}
              className="aspect-video w-full object-contain"
            />
          )
        )}

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
