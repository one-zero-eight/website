import { useState, useMemo } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import { ArchivedTournament } from "./ArchivedTournament";
import { CreateTournamentForm } from "./CreateTournamentForm";
import {
  LiveTournament,
  type TourData,
  type TournamentStage,
} from "./LiveTournament";
import {
  LIVE_REFETCH_MS,
  useTabletennisRefresh,
} from "./useTabletennisRefresh";
import type { PlayerOption } from "./PlayersField";
import { Pager } from "./Pager";
import { pageSlice } from "./ranking";
import { formatDay } from "./format";
import { t } from "@lingui/core/macro";

export type { TournamentStage };

/** places shown for a completed tournament before "Show all" */
const TOP_PLACES_PREVIEW = 3;

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

function getPlacementData(tour: TourData):
  | {
      playerId: string;
      placeLabel: string;
    }[]
  | null {
  const qualTop = tour.qual_top;
  if (!qualTop || Object.keys(qualTop).length === 0) return null;

  return Object.entries(qualTop)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([place, playerId]) => ({
      playerId,
      placeLabel: t`Place ${Number(place)}`,
    }));
}

function stageLabel(tour: TourData): string {
  if ((tour.qual_seeding ?? []).length > 0) return t`Qualification`;
  if (tour.groups_locked) return t`Group stage`;
  return t`Forming groups`;
}

export function TabletennisTournaments({
  tourId,
  stage,
}: {
  tourId?: string;
  stage: TournamentStage;
}) {
  const { t, i18n } = useLingui();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [completedPage, setCompletedPage] = useState(0);
  const [expandedTours, setExpandedTours] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = useTabletennisRefresh();

  // one list for active and completed tournaments, so a tournament is always in exactly one of them
  const toursQuery = $tabletennis.queryOptions("get", "/get-tours");
  const { data: toursData, isPending: toursPending } = $tabletennis.useQuery(
    "get",
    "/get-tours",
    undefined,
    { refetchInterval: LIVE_REFETCH_MS },
  );

  const { data: playersData } = $tabletennis.useQuery("get", "/players");

  const { data: isAdminData } = $tabletennis.useQuery("get", "/isadmin");
  const isAdmin =
    (isAdminData as { is_admin?: boolean } | undefined)?.is_admin ?? false;

  const { activeTours, completedTours } = useMemo(() => {
    const all = (toursData as unknown as TourData[] | undefined) ?? [];
    return {
      activeTours: all.filter((t) => t.active),
      completedTours: all.filter((t) => !t.active),
    };
  }, [toursData]);

  const allPlayers = useMemo<PlayerOption[]>(() => {
    if (!playersData) return [];
    const raw = playersData as unknown as {
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    return (raw.players ?? []).map((p) => ({
      name: p.nickname,
      id: p.innohassle_id,
      rating: p.rating,
      guest: p.placeholder,
    }));
  }, [playersData]);

  const playerNameMap = useMemo(
    () => new Map(allPlayers.map((p) => [p.id, p.name])),
    [allPlayers],
  );

  /** moves the tournament between active and completed right away, the refetch confirms it */
  function setTourActive(id: string, active: boolean) {
    queryClient.setQueryData(
      toursQuery.queryKey,
      (prev) =>
        (prev as unknown as TourData[] | undefined)?.map((t) =>
          t.id === id ? { ...t, active } : t,
        ) as typeof prev,
    );
    return refresh();
  }

  function removeTour(id: string) {
    openTour(undefined);
    queryClient.setQueryData(
      toursQuery.queryKey,
      (prev) =>
        (prev as unknown as TourData[] | undefined)?.filter(
          (t) => t.id !== id,
        ) as typeof prev,
    );
    refresh();
  }

  function openTour(id: string | undefined, nextStage?: TournamentStage) {
    navigate({
      to: "/tabletennis/tournaments",
      search: {
        tour: id,
        stage: nextStage === "qualification" ? nextStage : undefined,
      },
    });
    window.scrollTo({ top: 0 });
  }

  if (toursPending) {
    return <div className="skeleton h-48 w-full" />;
  }

  if (tourId) {
    const live = activeTours.find((t) => t.id === tourId);
    if (live) {
      return (
        <LiveTournament
          tour={live}
          allPlayers={allPlayers}
          isAdmin={isAdmin}
          stage={stage}
          onStageChange={(s) => openTour(tourId, s)}
          onBack={() => openTour(undefined)}
          onFinished={() => {
            openTour(undefined);
            setTourActive(live.id, false);
          }}
          onDeleted={() => removeTour(live.id)}
          onChanged={refresh}
        />
      );
    }
    const archived = completedTours.find((t) => t.id === tourId);
    if (archived) {
      return (
        <ArchivedTournament
          tour={archived}
          players={allPlayers}
          isAdmin={isAdmin}
          onBack={() => openTour(undefined)}
          onReopened={() => setTourActive(archived.id, true)}
          onDeleted={() => removeTour(archived.id)}
        />
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 px-7 py-16 text-center">
        <p className="text-base-content/60">
          <Trans>Tournament not found.</Trans>
        </p>
        <button
          type="button"
          onClick={() => openTour(undefined)}
          className="h-11 rounded-xl border border-[#712BB2] px-5 text-sm font-medium text-[#712BB2]"
        >
          <Trans>All tournaments</Trans>
        </button>
      </div>
    );
  }

  if (showCreateForm && isAdmin) {
    return (
      <CreateTournamentForm
        options={allPlayers}
        onCreated={async (id) => {
          setShowCreateForm(false);
          await refresh();
          openTour(id);
        }}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-6 md:px-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-light">
            <Trans>Active tournaments</Trans>
          </h2>
          {isAdmin && (
            <button
              type="button"
              className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-[#712BB2] px-4 text-sm font-medium text-white"
              onClick={() => setShowCreateForm(true)}
            >
              <span className="icon-[mdi--plus] text-lg" />
              <Trans>Create</Trans>
            </button>
          )}
        </div>

        {activeTours.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="icon-[mdi--trophy-outline] text-6xl text-[#712BB2]/30" />
            <p className="text-base-content/50 max-w-sm text-sm">
              {isAdmin
                ? t`No active tournaments. Create one to start managing groups and the qualification bracket.`
                : t`No active tournament at the moment.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeTours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => openTour(tour.id)}
                className="bg-base-100 flex min-h-20 items-center gap-3 rounded-2xl border border-[#712BB2] p-4 text-left transition-colors hover:bg-[#712BB2]/5"
              >
                <span className="icon-[mdi--tournament] shrink-0 text-3xl text-[#712BB2]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {tour.name}
                  </span>
                  <span className="text-base-content/50 block text-xs tabular-nums">
                    {tour.date && `${formatDay(tour.date, i18n.locale)} · `}
                    <Trans>{tour.players.length} players</Trans> ·{" "}
                    {stageLabel(tour)}
                  </span>
                </span>
                <span className="icon-[mdi--chevron-right] text-base-content/40 shrink-0 text-2xl" />
              </button>
            ))}
          </div>
        )}
      </div>

      {completedTours.length > 0 && (
        <div className="mt-4 border-t px-2 pt-6">
          <h2 className="text-base-content mb-4 px-5 text-lg font-light">
            <Trans>Completed tournaments</Trans>
          </h2>
          <Pager
            page={completedPage}
            total={completedTours.length}
            onChange={setCompletedPage}
          />
          <div className="flex flex-col gap-4">
            {pageSlice(completedTours, completedPage).map((tour) => {
              const placements = getPlacementData(tour);
              const expanded = expandedTours.has(tour.id);
              const shown =
                placements && !expanded
                  ? placements.slice(0, TOP_PLACES_PREVIEW)
                  : placements;
              const hiddenCount =
                (placements?.length ?? 0) - TOP_PLACES_PREVIEW;
              return (
                <div key={tour.id} className="bg-base-200 rounded-box mx-5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {tour.name}
                    </span>
                    {tour.date && (
                      <span className="text-base-content/40 shrink-0 text-[11px] tabular-nums">
                        {formatDay(tour.date, i18n.locale)}
                      </span>
                    )}
                  </div>
                  {shown ? (
                    <div className="flex flex-col gap-1">
                      {shown.map((p) => (
                        <div
                          key={p.placeLabel}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs font-medium">
                            {playerNameMap.get(p.playerId) ?? p.playerId}
                          </span>
                          <span className="text-base-content/50 text-[10px]">
                            {p.placeLabel}
                          </span>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTours((prev) => {
                              const next = new Set(prev);
                              if (next.has(tour.id)) next.delete(tour.id);
                              else next.add(tour.id);
                              return next;
                            })
                          }
                          className="mt-1 flex min-h-9 items-center gap-1 self-start text-xs font-medium text-[#712BB2]"
                        >
                          <span
                            className={
                              expanded
                                ? "icon-[mdi--chevron-up] text-base"
                                : "icon-[mdi--chevron-down] text-base"
                            }
                          />
                          {expanded ? (
                            <Trans>Show top 3 only</Trans>
                          ) : (
                            <Trans>Show all {placements!.length} places</Trans>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-base-content/50 text-xs">
                      <Trans>No placement data</Trans>
                    </p>
                  )}
                  {(tour.games.total_count > 0 || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => openTour(tour.id)}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#712BB2] text-sm font-medium text-[#712BB2] transition-colors hover:bg-[#712BB2]/10"
                    >
                      <span className="icon-[mdi--tournament] text-base" />
                      {tour.games.total_count > 0 ? (
                        <Trans>View games</Trans>
                      ) : (
                        <Trans>Open</Trans>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
