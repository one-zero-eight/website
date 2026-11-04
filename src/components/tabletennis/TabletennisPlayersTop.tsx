import { cn } from "@/lib/ui/cn";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { useMemo, useState, useEffect } from "react";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { PlayerActionMenu } from "./PlayerActionMenu.tsx";
import { GuestBadge } from "./PlayersField";
import { BACKGROUND_REFETCH_MS } from "./useTabletennisRefresh";
import { Pager } from "./Pager";
import { pageSlice, rankByRating } from "./ranking";

const PLAYERS_PAGE_SIZE = 25;

type PlayerEntry = {
  place: number;
  name: string;
  rating: number;
  status: string;
  visible: boolean;
  isAdmin: boolean;
  guest: boolean;
  innohassle_id: string;
  raw: ListedPlayer;
};

type SortKey = "name" | "rating";
type SortDir = "asc" | "desc";

type Filters = {
  status: "all" | "beginner" | "advanced";
  ratingMin: number;
  ratingMax: number;
  nameSearch: string;
  showHidden: boolean;
  adminsOnly: boolean;
  guestsOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

type SchemaPlayer = tabletennisTypes.SchemaPlayer;
type ListedPlayer = SchemaPlayer & { is_active: boolean; is_admin?: boolean };

function SortArrow({
  sortKey,
  activeSortKey,
  sortDir,
}: {
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
}) {
  if (activeSortKey !== sortKey)
    return <span className="text-base-content/30 ml-1">↑</span>;
  return <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
}

const INITIAL_FILTERS: Filters = {
  status: "all",
  ratingMin: 0,
  ratingMax: 9999,
  nameSearch: "",
  showHidden: false,
  adminsOnly: false,
  guestsOnly: false,
  sortKey: "rating",
  sortDir: "desc",
};

function toPlayerEntry(p: ListedPlayer, place: number): PlayerEntry {
  return {
    place,
    name: p.nickname,
    rating: p.rating,
    status: p.status ?? "",
    visible: p.is_active,
    isAdmin: p.is_admin ?? false,
    guest: p.placeholder,
    innohassle_id: p.innohassle_id,
    raw: p,
  };
}

export function TabletennisPlayersTop() {
  const { t } = useLingui();
  const { data, isPending, isError, error } = $tabletennis.useQuery(
    "get",
    "/players",
    undefined,
    { refetchInterval: BACKGROUND_REFETCH_MS },
  );

  const { data: isAdminData } = $tabletennis.useQuery("get", "/isadmin");
  const isAdmin =
    (isAdminData as { is_admin?: boolean } | undefined)?.is_admin ?? false;

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debounced, setDebounced] = useState<Filters>(INITIAL_FILTERS);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  // places are counted inside the chosen status tab among the players the table
  // can show (active ones, or everyone with "Show hidden"), so there are no gaps;
  // the name and rating filters keep each player's place in that tab
  const entries = useMemo(() => {
    if (!data) return [];
    const raw = data as unknown as {
      total: number;
      players: ListedPlayer[];
    };
    const pool = raw.players
      .filter((p) => debounced.showHidden || p.is_active)
      .filter(
        (p) =>
          debounced.status === "all" ||
          (p.status ?? "").toLowerCase() === debounced.status,
      );
    // guests have no place in the top; only admins see them, to link them to accounts
    const ranked = rankByRating(pool.filter((p) => !p.placeholder)).map(
      ({ player, place }) => toPlayerEntry(player, place),
    );
    if (!isAdmin) return ranked;
    const guests = pool
      .filter((p) => p.placeholder)
      .map((p) => toPlayerEntry(p, 0));
    return [...ranked, ...guests];
  }, [data, debounced.showHidden, debounced.status, isAdmin]);

  const results = useMemo(() => {
    const filtered = entries
      .filter(
        (p) =>
          p.rating >= debounced.ratingMin && p.rating <= debounced.ratingMax,
      )
      .filter((p) =>
        p.name.toLowerCase().includes(debounced.nameSearch.toLowerCase()),
      )
      .filter((p) => !debounced.adminsOnly || p.isAdmin)
      .filter((p) => !debounced.guestsOnly || p.guest);

    const sorted = [...filtered].sort((a, b) => {
      const mul = debounced.sortDir === "asc" ? 1 : -1;
      return debounced.sortKey === "name"
        ? a.name.localeCompare(b.name) * mul
        : (a.rating - b.rating) * mul || a.place - b.place;
    });

    return sorted;
  }, [entries, debounced]);

  const visibleResults = pageSlice(results, page, PLAYERS_PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setFilters((prev) => ({
      ...prev,
      sortKey: key,
      sortDir: prev.sortKey === key && prev.sortDir === "desc" ? "asc" : "desc",
    }));
  }

  if (isPending) return <div className="skeleton h-48 w-full" />;

  if (isError && isApiHttpError(error) && error.httpCode === 401) {
    return (
      <div className="py-10 text-center">
        <p className="text-base-content/70 mb-2">
          <Trans>Register to see the players list.</Trans>
        </p>
        <a
          href="/tabletennis"
          className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-[#712BB2]/90 md:px-8 md:py-3 md:text-sm"
        >
          <Trans>Go to profile</Trans>
        </a>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-error py-8 text-center">
        {formatApiErrorMessage(error)}
      </p>
    );
  }

  return (
    <div className="mx-5 my-4 flex flex-col gap-4">
      {/* Status tabs */}
      <div className="tabs tabs-box bg-base-200 w-fit text-sm md:text-base">
        {(["all", "beginner", "advanced"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={cn(
              "tab rounded-btn",
              debounced.status === s && "bg-[#712BB2] text-white",
            )}
            onClick={() => setFilters((prev) => ({ ...prev, status: s }))}
          >
            {s === "all" ? (
              <Trans>All</Trans>
            ) : s === "beginner" ? (
              <Trans>Beginner</Trans>
            ) : (
              <Trans>Advanced</Trans>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-base-content/70 text-sm">
            <Trans>Rating:</Trans>
          </label>
          <input
            type="number"
            placeholder={t`Min`}
            value={filters.ratingMin || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                ratingMin: Number(e.target.value) || 0,
              }))
            }
            className="input input-sm bg-base-200 w-20 rounded-lg"
          />
          <span className="text-base-content/50">—</span>
          <input
            type="number"
            placeholder={t`Max`}
            value={filters.ratingMax === 9999 ? "" : filters.ratingMax}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                ratingMax: Number(e.target.value) || 9999,
              }))
            }
            className="input input-sm bg-base-200 w-20 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-base-content/70 text-sm">
            <Trans>Name:</Trans>
          </label>
          <input
            type="text"
            placeholder={t`Search...`}
            value={filters.nameSearch}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, nameSearch: e.target.value }))
            }
            className="input input-sm bg-base-200 w-36 rounded-lg"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={filters.showHidden}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, showHidden: e.target.checked }))
            }
          />
          <span className="text-base-content/70">
            <Trans>Show hidden</Trans>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={filters.adminsOnly}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, adminsOnly: e.target.checked }))
            }
          />
          <span className="text-base-content/70">
            <Trans>Admins only</Trans>
          </span>
        </label>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={filters.guestsOnly}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  guestsOnly: e.target.checked,
                }))
              }
            />
            <span className="text-base-content/70">
              <Trans>Guests only</Trans>
            </span>
          </label>
        )}
      </div>

      {/* Results count */}
      <p className="text-base-content/50 text-xs">
        <Plural value={results.length} one="# player" other="# players" />
      </p>

      <Pager
        page={page}
        total={results.length}
        onChange={setPage}
        pageSize={PLAYERS_PAGE_SIZE}
      />

      {/* Table */}
      <div className="bg-base-200 rounded-box overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-base-300 text-base-content/50 border-b text-xs uppercase">
              <th className="w-12 px-4 py-4">#</th>
              <th
                className="cursor-pointer px-4 py-4 select-none"
                onClick={() => toggleSort("name")}
              >
                <Trans>Name</Trans>{" "}
                <SortArrow
                  sortKey="name"
                  activeSortKey={debounced.sortKey}
                  sortDir={debounced.sortDir}
                />
              </th>
              <th
                className="w-24 cursor-pointer px-4 py-4 select-none"
                onClick={() => toggleSort("rating")}
              >
                <Trans>Rating</Trans>{" "}
                <SortArrow
                  sortKey="rating"
                  activeSortKey={debounced.sortKey}
                  sortDir={debounced.sortDir}
                />
              </th>
              <th className="w-24 px-4 py-4">
                <Trans>Status</Trans>
              </th>
              <th className="w-24 px-4 py-4">
                <Trans>Visible</Trans>
              </th>
              {isAdmin && <th className="w-12 px-4 py-4" />}
            </tr>
          </thead>
          <tbody>
            {visibleResults.map((p) => (
              <tr
                key={p.innohassle_id}
                className="border-base-300 border-b last:border-0"
              >
                <td className="text-base-content/70 px-4 py-3">
                  {p.guest ? "—" : p.place}
                </td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.rating}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        "badge badge-sm",
                        p.status.toLowerCase() === "active"
                          ? "badge-primary"
                          : "badge-ghost",
                      )}
                    >
                      {p.status.toLowerCase() === "beginner" ? (
                        <Trans>Beginner</Trans>
                      ) : p.status.toLowerCase() === "advanced" ? (
                        <Trans>Advanced</Trans>
                      ) : (
                        p.status
                      )}
                    </span>
                    {p.isAdmin && (
                      <span className="badge badge-sm border-[#712BB2] bg-transparent text-[#712BB2]">
                        <Trans>admin</Trans>
                      </span>
                    )}
                    {p.guest && <GuestBadge />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.visible ? "text-green-500" : "text-base-content/30"
                    }
                  >
                    {p.visible ? <Trans>visible</Trans> : <Trans>hidden</Trans>}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <PlayerActionMenu player={p.raw} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleResults.length === 0 && (
          <p className="text-base-content/50 py-6 text-center">
            <Trans>No players match the current filters</Trans>
          </p>
        )}
      </div>
    </div>
  );
}
