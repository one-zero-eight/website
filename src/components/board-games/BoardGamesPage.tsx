import { ReservationOverdueTag } from "./ReservationOverdueTag.tsx";
import { $boardGames } from "@/api/board-games";
import { $accounts } from "@/api/accounts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  ReservationStatus,
  type SchemaBoardGameWithAvailabilityOut,
  type SchemaReservationOut,
} from "@/api/board-games/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { BoardGameImage } from "@/components/board-games/BoardGameImage.tsx";
import { GameInformationField } from "@/components/board-games/GameInformationField.tsx";
import {
  ReservationFormFields,
  UserReservationDetailsModal,
} from "@/components/board-games/UserReservationDetailsModal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { FormEvent, ReactNode, useRef, useState } from "react";
import {
  getReservationStatusLabel,
  isReservationOverdue,
  prioritizeOverdueReservations,
} from "./reservation-presentation";

type BoardGame = SchemaBoardGameWithAvailabilityOut & { id: string };

export function BoardGamesPage({ gameId }: { gameId?: string }) {
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
        reservations={prioritizeOverdueReservations(reservationsNewestFirst)}
        gameTitles={gameTitles}
        isPending={reservationsQuery.isPending}
        error={reservationsQuery.error}
      />
      <GamesCatalogueSection
        gameId={gameId}
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
  reservations: SchemaReservationOut[];
  gameTitles: Map<string, string>;
  isPending: boolean;
  error: unknown;
}) {
  const { t } = useLingui();
  const reservationCount = reservations.length;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [reservationToView, setReservationToView] =
    useState<SchemaReservationOut | null>(null);

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
          <h1 className="text-2xl font-semibold">
            <Trans>Your reservations</Trans>
          </h1>
          {!isPending && !error && (
            <p className="text-base-content/60 text-sm">
              <Trans>{reservationCount} total</Trans>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn btn-square btn-ghost"
            onClick={() => handleScroll(-1)}
            disabled={reservations.length < 2}
            title={t`Previous reservations`}
          >
            <span className="icon-[material-symbols--chevron-left] text-2xl" />
          </button>
          <button
            type="button"
            className="btn btn-square btn-ghost"
            onClick={() => handleScroll(1)}
            disabled={reservations.length < 2}
            title={t`Next reservations`}
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
        <QueryError title={t`Could not load reservations`} error={error} />
      )}
      {!isPending && !error && reservations.length === 0 && (
        <EmptyState message={t`You have no reservations yet.`} />
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
  reservation: SchemaReservationOut;
  gameTitle?: string;
  onView: () => void;
}) {
  const { t, i18n } = useLingui();
  const returnDate = reservation.return_date;
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
            {gameTitle ?? t`Unknown game`}
          </h2>
          <p className="text-base-content/60 text-sm">
            {new Date(reservation.created_at).toLocaleString(i18n.locale)}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
          <ReservationStatusBadge status={reservation.status} />
          <ReservationOverdueTag reservation={reservation} />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="icon-[mdi--telegram] text-primary text-xl" />
          <span>
            {reservation.tg_alias
              ? `@${reservation.tg_alias.replace(/^@/, "")}`
              : t`Telegram not provided`}
          </span>
        </div>
        {returnDate && (
          <div className="flex items-center gap-2">
            <span className="icon-[material-symbols--event-outline] text-xl" />
            <span>
              <Trans>Return by {returnDate}</Trans>
            </span>
          </div>
        )}
      </div>
      <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
        <Trans>View information</Trans>
        <span className="icon-[material-symbols--arrow-forward] text-lg" />
      </span>
    </article>
  );
}

function GamesCatalogueSection({
  gameId,
  games,
  isPending,
  error,
}: {
  gameId?: string;
  games: BoardGame[];
  isPending: boolean;
  error: unknown;
}) {
  const { t } = useLingui();
  const [gameToReserve, setGameToReserve] = useState<BoardGame | null>(null);
  const navigate = useNavigate();
  const viewedGame = games.find((game) => game.id === gameId);

  function handleCloseGame() {
    void navigate({
      to: "/board-games",
      search: { gameId: undefined },
      replace: true,
    });
  }
  const [searchQuery, setSearchQuery] = useState("");
  const trimmedSearchQuery = searchQuery.trim();
  const normalizedSearchQuery = trimmedSearchQuery.toLocaleLowerCase();
  const filteredGames = games.filter((game) =>
    game.title.toLocaleLowerCase().includes(normalizedSearchQuery),
  );
  const visibleGameCount = filteredGames.length;
  const gameCount = games.length;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-2xl font-semibold">
          <Trans>All games</Trans>
        </h2>
        {!isPending && !error && (
          <p className="text-base-content/60 text-sm">
            {normalizedSearchQuery ? (
              <Trans>
                {visibleGameCount} of {gameCount} titles
              </Trans>
            ) : (
              <Trans>{gameCount} titles</Trans>
            )}
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
          placeholder={t`Search games by name`}
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
        <QueryError title={t`Could not load games`} error={error} />
      )}
      {gameId && !isPending && !error && !viewedGame && (
        <div className="alert alert-warning">
          <span>
            <Trans>This game is no longer in the catalogue.</Trans>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCloseGame}
          >
            <Trans>Dismiss</Trans>
          </button>
        </div>
      )}
      {!isPending && !error && games.length === 0 && (
        <EmptyState message={t`No games are available yet.`} />
      )}
      {!isPending &&
        !error &&
        games.length > 0 &&
        filteredGames.length === 0 && (
          <EmptyState
            message={<Trans>No games match "{trimmedSearchQuery}".</Trans>}
          />
        )}
      {!isPending && !error && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 gap-3 @md/content:grid-cols-2 @3xl/content:grid-cols-3">
          {filteredGames.map((game) => {
            const availableCopies = game.available_copies;
            const totalCopies = game.total_copies;
            return (
              <article
                key={game.id}
                className="border-base-300 bg-base-100 hover:bg-base-200/50 flex min-w-0 cursor-pointer flex-col gap-3 border p-3 transition-colors"
                onClick={() =>
                  void navigate({
                    to: "/board-games",
                    search: { gameId: game.id },
                  })
                }
              >
                <div className="flex min-w-0 gap-3">
                  <BoardGameImage
                    boardGameId={game.id}
                    hasPhoto={game.has_photo}
                    className="h-20 w-20 shrink-0 object-cover"
                  />
                  <div className="min-w-0 grow">
                    <h3 className="truncate font-semibold">
                      <Link
                        to="/board-games"
                        search={{ gameId: game.id }}
                        className="link link-hover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {game.title}
                      </Link>
                    </h3>
                    <p className="text-base-content/60 line-clamp-3 text-sm whitespace-pre-wrap">
                      {game.description}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-sm">
                    <Trans>
                      <span className="text-lg font-semibold tabular-nums">
                        {availableCopies}
                      </span>
                      <span className="text-base-content/60">
                        {" "}
                        of {totalCopies} available
                      </span>
                    </Trans>
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
                    <Trans>Reserve</Trans>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewedGame && (
        <UserGameDetailsModal
          game={viewedGame}
          onOpenChange={(open) => !open && handleCloseGame()}
          onReserve={() => {
            handleCloseGame();
            setGameToReserve(viewedGame);
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
  const { t } = useLingui();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopyLink() {
    if (isCopying) return;
    setIsCopying(true);
    try {
      const location = router.buildLocation({
        to: "/board-games",
        search: { gameId: game.id },
      });
      await navigator.clipboard.writeText(
        new URL(location.href, window.location.origin).href,
      );
      showSuccess(msg`Link copied`, msg`Share it to open this game directly.`);
    } catch {
      showError(
        msg`Could not copy link`,
        msg`Copy the game URL from your browser’s address bar.`,
      );
    } finally {
      setIsCopying(false);
    }
  }
  return (
    <Modal open onOpenChange={onOpenChange} title={t`Game information`}>
      <div className="flex flex-col gap-4">
        <BoardGameImage
          boardGameId={game.id}
          hasPhoto={game.has_photo}
          className="mx-auto aspect-square w-full max-w-xs object-contain"
        />

        <div className="grid grid-cols-1 gap-3 @sm/modal:grid-cols-2">
          <h2 className="text-xl font-semibold wrap-break-word">
            {game.title}
          </h2>
          <GameInformationField
            label={t`Description`}
            className="@sm/modal:col-span-2"
          >
            {game.description}
          </GameInformationField>
          <div className="border-base-300 grid grid-cols-2 gap-3 border-y py-3 @sm/modal:col-span-2">
            <div>
              <p className="text-base-content/60 text-xs font-semibold uppercase">
                <Trans>Total copies</Trans>
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {game.total_copies}
              </p>
            </div>
            <div>
              <p className="text-base-content/60 text-xs font-semibold uppercase">
                <Trans>Available copies</Trans>
              </p>
              <p className="text-primary text-lg font-semibold tabular-nums">
                {game.available_copies}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void handleCopyLink()}
            disabled={isCopying}
          >
            {isCopying ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <span className="icon-[material-symbols--link] text-xl" />
            )}
            <Trans>Copy link</Trans>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onReserve}
            disabled={game.available_copies < 1}
          >
            <Trans>Reserve game</Trans>
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
  const { t } = useLingui();
  const gameTitle = game.title;
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const accountQuery = $accounts.useQuery("get", "/users/me");
  const telegramAlias =
    accountQuery.data?.telegram_info?.username?.trim() ?? "";
  const [returnDate, setReturnDate] = useState("");
  const [whenAvailable, setWhenAvailable] = useState("");
  const [comments, setComments] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const validationError =
    hasAttemptedSubmit && !returnDate ? t`Return date is required.` : null;
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
        showSuccess(msg`Game reserved`, msg`${gameTitle} has been reserved.`);
        onOpenChange(false);
      },
      onError: (error) => {
        showError(msg`Could not reserve game`, formatReservationError(error));
      },
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || accountQuery.isPending || accountQuery.isError)
      return;
    setHasAttemptedSubmit(true);
    if (!telegramAlias || !returnDate) return;
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
      title={t`Reserve ${gameTitle}`}
      closeOnOutsidePress={!mutation.isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {accountQuery.isPending && <div className="skeleton h-10 w-full" />}
        {accountQuery.isError && (
          <QueryError
            title={t`Could not load your Telegram account`}
            error={accountQuery.error}
          />
        )}
        {!accountQuery.isPending && !accountQuery.isError && !telegramAlias && (
          <div className="alert alert-warning text-sm">
            <span>
              <Trans>
                Connect Telegram in your account settings and make sure it has a
                username before reserving a game.
              </Trans>
            </span>
            <Link to="/account" className="link">
              <Trans>Account settings</Trans>
            </Link>
          </div>
        )}
        <ReservationFormFields
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
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              mutation.isPending ||
              accountQuery.isPending ||
              accountQuery.isError ||
              !telegramAlias
            }
          >
            {mutation.isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            <Trans>Reserve game</Trans>
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
    return msg`You already have an active reservation for this game.`;
  }
  if (apiError.httpCode === 409) {
    return msg`This game cannot be reserved right now. You may already have an active reservation, or no copies may be available.`;
  }
  if (apiError.httpCode === 404) {
    return msg`This game is no longer available in the catalogue. Refresh the page and choose another game.`;
  }
  if (apiError.httpCode === 401) {
    return msg`Your session has expired. Sign in again and retry the reservation.`;
  }

  return formatApiErrorMessage(error);
}

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { i18n } = useLingui();
  return (
    <span
      className={cn(
        "badge shrink-0 capitalize",
        status === ReservationStatus.reserved && "badge-warning",
        status === ReservationStatus.taken && "badge-info",
        status === ReservationStatus.returned && "badge-success",
      )}
    >
      {i18n._(getReservationStatusLabel(status))}
    </span>
  );
}

function EmptyState({ message }: { message: ReactNode }) {
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
