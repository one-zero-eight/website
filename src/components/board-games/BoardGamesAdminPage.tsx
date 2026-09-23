import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaBoardGameWithStorageAvailability,
  type SchemaReservation,
} from "@/api/board-games/types.ts";
import { BoardGameImage } from "@/components/board-games/BoardGameImage.tsx";
import {
  BorrowerNameModal,
  ReservationDetailsModal,
} from "@/components/board-games/ReservationDetailsModal.tsx";
import {
  boardGamesModalClassName,
  byCreatedAtDesc,
  GameInfoBody,
  ListState,
  ReservationStatusBadge,
  SearchInput,
  SkeletonGrid,
  telegramHandle,
  withId,
} from "@/components/board-games/shared.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormEvent, useRef, useState } from "react";

type Reservation = SchemaReservation & { id: string };
type BoardGame = SchemaBoardGameWithStorageAvailability & { id: string };

export function BoardGamesAdminPage() {
  // Omitted `how` defaults to current reservations (reserved and taken).
  const reservationsQuery = $boardGames.useQuery("get", "/admin/reservations");
  const gamesQuery = $boardGames.useQuery("get", "/admin/board-games");
  const reservations = byCreatedAtDesc(withId(reservationsQuery.data));
  const games = withId(gamesQuery.data);
  const gameTitles = new Map(games.map((game) => [game.id, game.title]));

  return (
    <main className="@container/content mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 @md/content:p-6">
      <ReservationsSection
        reservations={reservations}
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
  const [reservationToTake, setReservationToTake] =
    useState<Reservation | null>(null);
  const { updateStatus, pendingReservationId } = useReservationStatusMutation(
    () => setReservationToTake(null),
  );

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
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {reservations.length} active
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/board-games/admin/reservations"
            className="btn btn-ghost btn-sm gap-3"
          >
            Search reservations
            <span className="icon-[material-symbols--search] text-lg" />
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

      <ListState
        isPending={isPending}
        error={error}
        errorTitle="Could not load reservations"
        emptyMessage={
          reservations.length === 0
            ? "There are no active reservations."
            : undefined
        }
        pending={
          <SkeletonGrid
            count={3}
            className="flex gap-3 overflow-hidden"
            itemClassName="h-52 w-[min(86cqw,22rem)] shrink-0"
          />
        }
      >
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              gameTitle={gameTitles.get(reservation.board_game_id)}
              isUpdating={pendingReservationId === reservation.id}
              onView={() => setReservationToView(reservation)}
              onTake={() => setReservationToTake(reservation)}
              onReturn={() =>
                updateStatus(
                  reservation.id,
                  ReservationStatus.returned,
                  reservation.borrower_name,
                )
              }
            />
          ))}
        </div>
      </ListState>

      {reservationToTake && (
        <BorrowerNameModal
          onOpenChange={(open) => !open && setReservationToTake(null)}
          onSubmit={(borrowerName) =>
            updateStatus(
              reservationToTake.id,
              ReservationStatus.taken,
              borrowerName,
            )
          }
          isPending={pendingReservationId === reservationToTake.id}
          confirmLabel="Mark as taken"
        />
      )}
      {reservationToView && (
        <ReservationDetailsModal
          reservation={reservationToView}
          gameTitle={gameTitles.get(reservationToView.board_game_id)}
          onOpenChange={(open) => !open && setReservationToView(null)}
        />
      )}
    </section>
  );
}

function ReservationCard({
  reservation,
  gameTitle,
  isUpdating,
  onView,
  onTake,
  onReturn,
}: {
  reservation: Reservation;
  gameTitle?: string;
  isUpdating: boolean;
  onView: () => void;
  onTake: () => void;
  onReturn: () => void;
}) {
  const isReserved = reservation.status === ReservationStatus.reserved;
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
            {telegram ? (
              <a
                className="link link-hover font-medium"
                href={`https://t.me/${telegram}`}
                onClick={(event) => event.stopPropagation()}
              >
                @{telegram}
              </a>
            ) : (
              <span className="text-neutral-400">Telegram not provided</span>
            )}
          </div>
          {!isReserved && reservation.borrower_name && (
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--person-outline] text-primary text-xl" />
              <span>{reservation.borrower_name}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={cn(
            "btn btn-soft mt-auto",
            isReserved ? "btn-primary" : "btn-success",
          )}
          disabled={isUpdating}
          onClick={(event) => {
            event.stopPropagation();
            if (isReserved) {
              onTake();
              return;
            }
            onReturn();
          }}
        >
          {isUpdating && (
            <span className="loading loading-spinner loading-sm" />
          )}
          {isReserved ? "Mark as taken" : "Mark as returned"}
        </button>
      </div>
    </article>
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

  return {
    updateStatus,
    pendingReservationId: mutation.isPending
      ? mutation.variables?.params.path.id
      : null,
  };
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
            <p className="text-base-content/70 text-sm">
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
            ? "No games have been added yet."
            : filteredGames.length === 0
              ? `No games match "${searchQuery.trim()}".`
              : undefined
        }
        pending={
          <SkeletonGrid
            count={4}
            className="flex flex-col gap-2"
            itemClassName="h-16"
          />
        }
      >
        <div className="flex flex-col gap-2">
          {filteredGames.map((game) => (
            <StorageGameRow
              key={game.id}
              game={game}
              isDeleting={deletingGameId === game.id}
              deleteDisabled={deleteMutation.isPending}
              onView={() => setGameToView(game)}
              onEdit={() => setGameToEdit(game)}
              onDelete={() => void handleDeleteGame(game)}
            />
          ))}
        </div>
      </ListState>
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

function StorageGameRow({
  game,
  isDeleting,
  deleteDisabled,
  onView,
  onEdit,
  onDelete,
}: {
  game: BoardGame;
  isDeleting: boolean;
  deleteDisabled: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="bg-base-200 hover:bg-base-300 rounded-field flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors"
      onClick={onView}
    >
      <BoardGameImage
        boardGameId={game.id}
        photoFileId={game.photo_file_id}
        className="rounded-field size-14 shrink-0 object-cover"
      />
      <div className="min-w-0 grow">
        <h3 className="truncate font-medium">{game.title}</h3>
        <p className="text-base-content/70 text-sm">
          <span className="text-base-content font-medium tabular-nums">
            {game.available_in_storage}
          </span>
          {" in storage"}
          <span className="text-base-content/50">
            {` · ${game.available_copies} available · ${game.total_copies} copies`}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          title={`Edit ${game.title}`}
          disabled={isDeleting}
        >
          <span className="icon-[material-symbols--edit-outline] text-xl" />
        </button>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title={`Delete ${game.title}`}
          disabled={deleteDisabled}
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--delete-outline] text-xl" />
          )}
        </button>
      </div>
    </article>
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
          { label: "Total", value: game.total_copies },
          { label: "Available", value: game.available_copies, accent: true },
          { label: "In storage", value: game.available_in_storage },
        ]}
        action={
          <Link
            to="/board-games/admin/reservations"
            search={{ gameId: game.id }}
            className="btn btn-primary"
          >
            View reservations
            <span className="icon-[material-symbols--arrow-forward] text-xl" />
          </Link>
        }
      />
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
      const savedGame = game
        ? await editMutation.mutateAsync({
            params: { path: { id: game.id } },
            body,
          })
        : await createMutation.mutateAsync({ body });

      if (photoFile && savedGame.id) {
        const formData = new FormData();
        formData.append("photo_file", photoFile);
        await photoMutation.mutateAsync({
          params: { path: { id: savedGame.id } },
          // Generated client types this upload field as a string.
          body: formData as never,
        });
      }

      handleMutationSuccess();
    } catch (error) {
      handleMutationError(error);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit board game" : "Add board game"}
      containerClassName={boardGamesModalClassName}
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
              photoFileId={game.photo_file_id}
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
