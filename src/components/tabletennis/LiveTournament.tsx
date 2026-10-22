import { useMemo, useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { keepPreviousData } from "@tanstack/react-query";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/common/Modal.tsx";
import { ValidationMatches } from "./ValidationMatches";
import { QualificationMatches } from "./QualificationMatches";
import {
  type GameData,
  resolveBracket,
  standingsToTop,
  topsEqual,
} from "./bracket-utils";
import {
  type PlayerOption,
  PlayersField,
  failedPlayersOf,
  usePlayersField,
} from "./PlayersField";
import { formatDay } from "./format";
import { LIVE_REFETCH_MS } from "./useTabletennisRefresh";

export type TournamentStage = "validation" | "qualification";

export type TourData = {
  id: string;
  name: string;
  date: string;
  players: string[];
  active?: boolean;
  games: {
    val_game_ids: string[] | null;
    cval_game_ids: string[] | null;
    total_count: number;
  };
  qual_top?: Record<string, string>;
  val_top?: Record<string, string>;
  groups?: Record<string, string[]>;
  groups_locked?: boolean;
  qual_seeding?: string[];
};

export function LiveTournament({
  tour,
  allPlayers,
  isAdmin,
  stage,
  onStageChange,
  onBack,
  onFinished,
  onDeleted,
  onChanged,
}: {
  tour: TourData;
  allPlayers: PlayerOption[];
  isAdmin: boolean;
  stage: TournamentStage;
  onStageChange: (stage: TournamentStage) => void;
  onBack: () => void;
  onFinished: () => void;
  onDeleted: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t, i18n } = useLingui();
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const addField = usePlayersField(allPlayers);
  const { showError } = useToast();

  const gameIds = useMemo(
    () => [
      ...(tour.games.val_game_ids ?? []),
      ...(tour.games.cval_game_ids ?? []),
    ],
    [tour.games],
  );

  const { data: gamesByIdData, isPending: gamesPending } =
    $tabletennis.useQuery(
      "get",
      "/get-games-by-id",
      { params: { query: { ids: gameIds } } },
      {
        enabled: gameIds.length > 0,
        refetchInterval: LIVE_REFETCH_MS,
        placeholderData: keepPreviousData,
      },
    );

  const { mutate: finishTour, isPending: finishing } = $tabletennis.useMutation(
    "post",
    "/finish-tour",
    {
      onSuccess: onFinished,
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  const { mutate: addPlayers, isPending: addingPlayers } =
    $tabletennis.useMutation("post", "/reg-tour/add-player", {
      onSuccess: () => {
        onChanged();
        setShowAddPlayers(false);
        addField.reset();
      },
      onError: (error) => {
        const failed = failedPlayersOf(error);
        if (failed) addField.applyFailed(failed);
        else showError(msg`Error`, formatApiErrorDescriptor(error));
      },
    });

  const { mutateAsync: changeQualTop } = $tabletennis.useMutation(
    "post",
    "/reg-tour/change-qual-top",
    {
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  const tourPlayers = useMemo(() => {
    const inTour = new Set(tour.players);
    return allPlayers.filter((p) => inTour.has(p.id));
  }, [allPlayers, tour.players]);

  const addablePlayers = useMemo(() => {
    const inTour = new Set(tour.players);
    return allPlayers.filter((p) => !inTour.has(p.id));
  }, [allPlayers, tour.players]);

  const { validationGames, qualificationGames } = useMemo(() => {
    const games = (gamesByIdData as { games?: GameData[] } | undefined)?.games;
    const val = new Set(tour.games.val_game_ids ?? []);
    const cval = new Set(tour.games.cval_game_ids ?? []);
    return {
      validationGames: (games ?? []).filter((g) => val.has(g.game_id)),
      qualificationGames: (games ?? []).filter((g) => cval.has(g.game_id)),
    };
  }, [gamesByIdData, tour.games]);

  const groupsLocked = tour.groups_locked ?? false;
  const canDelete =
    (gameIds.length === 0 || !gamesPending) &&
    ![...validationGames, ...qualificationGames].some((g) => g.finished);
  const seeding = useMemo(() => tour.qual_seeding ?? [], [tour.qual_seeding]);

  const qualProgress = useMemo(() => {
    if (seeding.length === 0) return null;
    const bracket = resolveBracket(seeding, qualificationGames);
    const left = [...bracket.matches.values()].filter(
      (m) => m.status === "ready" || m.status === "waiting",
    ).length;
    return { bracket, left };
  }, [seeding, qualificationGames]);

  async function handleEndTournament() {
    // store every place decided so far before the tournament is archived,
    // so a tournament ended early still shows the places that were played out
    if (qualProgress && qualProgress.bracket.places.length > 0) {
      const top = standingsToTop(qualProgress.bracket.places);
      if (!topsEqual(top, tour.qual_top ?? {})) {
        try {
          await changeQualTop({
            params: { query: { tour_id: tour.id } },
            body: top,
          });
        } catch {
          return; // toast shown by onError, keep the tournament open
        }
      }
    }
    finishTour({ params: { query: { tour_id: tour.id } } });
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-2 px-2 pt-3 pb-2">
          <button
            type="button"
            aria-label={t`Back to tournaments`}
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#712BB2] hover:bg-[#712BB2]/10"
          >
            <span className="icon-[mdi--arrow-left] text-2xl" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-light">{tour.name}</h2>
            <p className="text-base-content/50 text-xs tabular-nums">
              {tour.date && `${formatDay(tour.date, i18n.locale)} · `}
              <Trans>{tour.players.length} players</Trans>
            </p>
          </div>
          {isAdmin && !groupsLocked && (
            <button
              type="button"
              className="border-base-content/30 text-base-content/70 hover:bg-base-content/10 h-10 shrink-0 rounded-xl border px-3 text-xs transition-colors"
              onClick={() => setShowAddPlayers((v) => !v)}
            >
              <Trans>Add players</Trans>
            </button>
          )}
          {isAdmin && canDelete && (
            <DeleteTourButton tour={tour} onDeleted={onDeleted} />
          )}
          {isAdmin && (
            <button
              type="button"
              className="border-base-content/30 text-base-content/70 hover:bg-base-content/10 h-10 shrink-0 rounded-xl border px-3 text-xs transition-colors"
              onClick={() => setShowEndConfirm(true)}
              disabled={finishing}
            >
              {finishing ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Trans>End</Trans>
              )}
            </button>
          )}
        </div>

        <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
          {(["validation", "qualification"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
                stage === s
                  ? "border-b-2 border-b-[#712BB2]"
                  : "text-base-content/50 hover:text-base-content",
              )}
              onClick={() => onStageChange(s)}
            >
              {s === "validation" ? (
                <Trans>Validation</Trans>
              ) : (
                <Trans>Qualification</Trans>
              )}
            </button>
          ))}
        </div>

        {showAddPlayers && !groupsLocked && (
          <div className="border-base-300 flex flex-col gap-2 border-b px-4 py-3">
            <PlayersField field={addField} options={addablePlayers} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="text-base-content/60 h-10 px-3 text-sm"
                onClick={() => {
                  setShowAddPlayers(false);
                  addField.reset();
                }}
              >
                <Trans>Cancel</Trans>
              </button>
              <button
                type="button"
                className="h-10 rounded-xl border border-[#712BB2] px-4 text-sm font-medium text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:opacity-40"
                onClick={() => {
                  const body = addField.prepare();
                  if (body)
                    addPlayers({
                      params: { query: { tour_id: tour.id } },
                      body,
                    });
                }}
                disabled={addingPlayers || addField.count === 0}
              >
                {addingPlayers ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Trans>Add</Trans>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === "validation" && (
          <ValidationMatches
            key={`validation-${tour.id}`}
            players={tourPlayers}
            tourId={tour.id}
            groups={tour.groups ?? {}}
            groupsLocked={groupsLocked}
            qualStarted={seeding.length > 0}
            validationGames={validationGames}
            isAdmin={isAdmin}
            onChanged={onChanged}
            onGoToQualification={() => onStageChange("qualification")}
          />
        )}
        {stage === "qualification" && (
          <QualificationMatches
            key={`qualification-${tour.id}`}
            players={tourPlayers}
            tourId={tour.id}
            groups={tour.groups ?? {}}
            groupsLocked={groupsLocked}
            qualSeeding={seeding}
            qualTop={tour.qual_top ?? {}}
            validationGames={validationGames}
            qualificationGames={qualificationGames}
            isAdmin={isAdmin}
            onChanged={onChanged}
          />
        )}
      </div>

      <Modal
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title={t`Finish tournament`}
      >
        <p className="text-base-content/80">
          <Trans>
            Are you sure you want to finish <strong>{tour.name}</strong>? It can
            be reopened from the archive later.
          </Trans>
        </p>
        {!qualProgress && (
          <p className="mt-3 rounded-xl border border-[#712BB2]/40 bg-[#712BB2]/10 px-3 py-2 text-sm">
            <Trans>
              Qualification has not started, no final standings will be saved.
            </Trans>
          </p>
        )}
        {qualProgress && !qualProgress.bracket.complete && (
          <p className="mt-3 rounded-xl border border-[#712BB2]/40 bg-[#712BB2]/10 px-3 py-2 text-sm">
            <Trans>
              Qualification is not finished. Matches left: {qualProgress.left}.
              Only the places decided so far (
              {qualProgress.bracket.places.length} of {seeding.length}) will be
              saved, and no bonuses are granted.
            </Trans>
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowEndConfirm(false)}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              handleEndTournament();
              setShowEndConfirm(false);
            }}
            disabled={finishing}
          >
            {finishing ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Trans>Confirm</Trans>
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}

/** deletes a tournament created by mistake; the server refuses once a game is finished */
export function DeleteTourButton({
  tour,
  onDeleted,
}: {
  tour: { id: string; name: string };
  onDeleted: () => void;
}) {
  const { t } = useLingui();
  const { showError, showConfirm } = useToast();
  const { mutateAsync: deleteTour, isPending } = $tabletennis.useMutation(
    "post",
    "/delete-tour",
    { onError: (e) => showError(msg`Error`, formatApiErrorDescriptor(e)) },
  );

  async function handleDelete() {
    const ok = await showConfirm({
      title: msg`Delete tournament`,
      message: msg`Delete ${tour.name}? No game has been played yet, so no rating changes. This cannot be undone.`,
      confirmText: msg`Delete`,
      cancelText: msg`Keep`,
      type: "warning",
    });
    if (!ok) return;
    try {
      await deleteTour({ params: { query: { tour_id: tour.id } } });
      onDeleted();
    } catch {
      // toast shown by onError
    }
  }

  return (
    <button
      type="button"
      aria-label={t`Delete tournament`}
      disabled={isPending}
      onClick={handleDelete}
      className="text-error hover:bg-error/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40"
    >
      {isPending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <span className="icon-[mdi--trash-can-outline] text-xl" />
      )}
    </button>
  );
}
