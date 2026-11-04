import { useMemo, useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { ValidationMatches } from "./ValidationMatches";
import { QualificationMatches } from "./QualificationMatches";
import type { GameData, Groups, Player } from "./bracket-utils";
import { formatDay } from "./format";
import { DeleteTourButton } from "./LiveTournament";

export type ArchivedTour = {
  id: string;
  name: string;
  date: string;
  players: string[];
  games: {
    val_game_ids: string[] | null;
    cval_game_ids: string[] | null;
  };
  qual_top?: Record<string, string>;
  groups?: Groups;
  qual_seeding?: string[];
};

const noop = async () => {};

/**
 * Read-only view of a finished tournament: the group tables and the
 * qualification bracket, drawn by the same components as a live tournament.
 * An admin can reopen it to correct games and standings.
 */
export function ArchivedTournament({
  tour,
  players,
  isAdmin,
  onBack,
  onReopened,
  onDeleted,
}: {
  tour: ArchivedTour;
  players: Player[];
  isAdmin: boolean;
  onBack: () => void;
  onReopened: () => Promise<void>;
  onDeleted: () => void;
}) {
  const { t, i18n } = useLingui();
  const [mode, setMode] = useState<"validation" | "qualification">(
    "validation",
  );
  const { showError, showConfirm } = useToast();
  const { mutateAsync: reopenTour, isPending: reopening } =
    $tabletennis.useMutation("post", "/reopen-tour", {
      onError: (e) => showError(msg`Error`, formatApiErrorDescriptor(e)),
    });

  async function handleReopen() {
    const ok = await showConfirm({
      title: msg`Reopen tournament`,
      message: msg`${tour.name} becomes active again, so its games and standings can be corrected. Finish it again when you are done.`,
      confirmText: msg`Reopen`,
      cancelText: msg`Cancel`,
      type: "warning",
    });
    if (!ok) return;
    try {
      await reopenTour({ params: { query: { tour_id: tour.id } } });
      await onReopened();
    } catch {
      // toast shown by onError
    }
  }

  const { valIds, cvalIds, ids } = useMemo(() => {
    const valIds = tour.games.val_game_ids ?? [];
    const cvalIds = tour.games.cval_game_ids ?? [];
    return { valIds, cvalIds, ids: [...valIds, ...cvalIds] };
  }, [tour.games]);

  const { data, isPending } = $tabletennis.useQuery(
    "get",
    "/get-games-by-id",
    { params: { query: { ids } } },
    { enabled: ids.length > 0 },
  );

  const { validationGames, qualificationGames } = useMemo(() => {
    const games =
      (data as { games?: GameData[] } | undefined)?.games ?? ([] as GameData[]);
    const val = new Set(valIds);
    const cval = new Set(cvalIds);
    return {
      validationGames: games.filter((g) => val.has(g.game_id)),
      qualificationGames: games.filter((g) => cval.has(g.game_id)),
    };
  }, [data, valIds, cvalIds]);

  const tourPlayers = useMemo(() => {
    const inTour = new Set(tour.players);
    return players.filter((p) => inTour.has(p.id));
  }, [players, tour.players]);

  const groups = tour.groups ?? {};
  const hasGroups = Object.keys(groups).length > 0;
  const seeding = tour.qual_seeding ?? [];

  return (
    <div className="flex flex-col">
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
          {tour.date && (
            <p className="text-base-content/50 text-xs tabular-nums">
              <Trans>
                {formatDay(tour.date, i18n.locale)} · {tour.players.length}{" "}
                players
              </Trans>
            </p>
          )}
        </div>
        {isAdmin &&
          (ids.length === 0 || !isPending) &&
          ![...validationGames, ...qualificationGames].some(
            (g) => g.finished,
          ) && <DeleteTourButton tour={tour} onDeleted={onDeleted} />}
        {isAdmin && (
          <button
            type="button"
            disabled={reopening}
            onClick={handleReopen}
            className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-[#712BB2] px-3 text-xs font-medium text-[#712BB2] disabled:opacity-40"
          >
            {reopening ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <span className="icon-[mdi--pencil-outline] text-base" />
                <Trans>Reopen</Trans>
              </>
            )}
          </button>
        )}
      </div>

      <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
        {(["validation", "qualification"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
              mode === m
                ? "border-b-2 border-b-[#712BB2]"
                : "text-base-content/50 hover:text-base-content",
            )}
            onClick={() => setMode(m)}
          >
            {m === "validation" ? (
              <Trans>Validation</Trans>
            ) : (
              <Trans>Qualification</Trans>
            )}
          </button>
        ))}
      </div>

      {ids.length > 0 && isPending ? (
        <div className="skeleton m-4 h-48" />
      ) : mode === "validation" ? (
        hasGroups ? (
          <ValidationMatches
            players={tourPlayers}
            tourId={tour.id}
            groups={groups}
            groupsLocked
            qualStarted={seeding.length > 0}
            validationGames={validationGames}
            isAdmin={false}
            onChanged={noop}
          />
        ) : (
          <PlainGames
            games={validationGames}
            empty={t`No group stage was played in this tournament.`}
          />
        )
      ) : seeding.length > 0 ? (
        <QualificationMatches
          players={tourPlayers}
          tourId={tour.id}
          groups={groups}
          groupsLocked
          qualSeeding={seeding}
          qualTop={tour.qual_top ?? {}}
          validationGames={validationGames}
          qualificationGames={qualificationGames}
          isAdmin={false}
          onChanged={noop}
        />
      ) : (
        <PlainGames
          games={qualificationGames}
          empty={t`No qualification was played in this tournament.`}
        />
      )}
    </div>
  );
}

/** games of older tournaments that were played before groups and the bracket existed */
function PlainGames({ games, empty }: { games: GameData[]; empty: string }) {
  if (games.length === 0) {
    return (
      <p className="text-base-content/50 px-4 py-10 text-center text-sm">
        {empty}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-4 py-5 md:px-7">
      {games.map((g) => {
        const p1Won = g.player1.score > g.player2.score;
        return (
          <div
            key={g.game_id}
            className="bg-base-200 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                g.finished && p1Won && "font-semibold",
              )}
            >
              {g.player1.nickname ?? g.player1.innohassle_id}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {g.finished ? `${g.player1.score} : ${g.player2.score}` : "—"}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-right",
                g.finished && !p1Won && "font-semibold",
              )}
            >
              {g.player2.nickname ?? g.player2.innohassle_id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
