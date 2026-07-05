import { cn } from "@/lib/ui/cn";
import { useMemo, useState, useEffect } from "react";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";

type PlayerEntry = {
  place: number;
  name: string;
  rating: number;
  status: string;
  visible: boolean;
};

type SortKey = "name" | "rating";
type SortDir = "asc" | "desc";

type Filters = {
  status: "all" | "beginner" | "advanced";
  ratingMin: number;
  ratingMax: number;
  nameSearch: string;
  showHidden: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

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
  sortKey: "rating",
  sortDir: "desc",
};

function toPlayerEntry(
  p: SchemaPlayer & { is_active: boolean },
  place: number,
): PlayerEntry {
  return {
    place,
    name: p.nickname,
    rating: p.rating,
    status: p.status ?? "",
    visible: p.is_active,
  };
}

export function TabletennisPlayersTop() {
  const { data, isPending, isError, error } = $tabletennis.useQuery(
    "get",
    "/players",
  );

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debounced, setDebounced] = useState<Filters>(INITIAL_FILTERS);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [debounced]);

  const entries = useMemo(() => {
    if (!data) return [];
    const raw = data as unknown as {
      total: number;
      players: (SchemaPlayer & { is_active: boolean })[];
    };
    const sorted = [...raw.players].sort((a, b) => b.rating - a.rating);
    return sorted.map((p, i) => toPlayerEntry(p, i + 1));
  }, [data]);

  const results = useMemo(() => {
    const filtered = entries
      .filter((p) => debounced.showHidden || p.visible)
      .filter(
        (p) =>
          debounced.status === "all" ||
          p.status.toLowerCase() === debounced.status,
      )
      .filter(
        (p) =>
          p.rating >= debounced.ratingMin && p.rating <= debounced.ratingMax,
      )
      .filter((p) =>
        p.name.toLowerCase().includes(debounced.nameSearch.toLowerCase()),
      );

    const sorted = [...filtered].sort((a, b) => {
      const mul = debounced.sortDir === "asc" ? 1 : -1;
      return debounced.sortKey === "name"
        ? a.name.localeCompare(b.name) * mul
        : (a.rating - b.rating) * mul;
    });

    return sorted;
  }, [entries, debounced]);

  const visibleResults = results.slice(0, visibleCount);

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
          Register to see the players list.
        </p>
        <a
          href="/tabletennis"
          className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-[#712BB2]/90 md:px-8 md:py-3 md:text-sm"
        >
          Go to profile
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
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-base-content/70 text-sm">Rating:</label>
          <input
            type="number"
            placeholder="Min"
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
            placeholder="Max"
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
          <label className="text-base-content/70 text-sm">Name:</label>
          <input
            type="text"
            placeholder="Search..."
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
          <span className="text-base-content/70">Show hidden</span>
        </label>
      </div>

      {/* Results count */}
      <p className="text-base-content/50 text-xs">
        Showing {visibleResults.length} of {results.length} players
      </p>

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
                Name{" "}
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
                Rating{" "}
                <SortArrow
                  sortKey="rating"
                  activeSortKey={debounced.sortKey}
                  sortDir={debounced.sortDir}
                />
              </th>
              <th className="w-24 px-4 py-4">Status</th>
              <th className="w-24 px-4 py-4">Visible</th>
            </tr>
          </thead>
          <tbody>
            {visibleResults.map((p) => (
              <tr
                key={p.name}
                className="border-base-300 border-b last:border-0"
              >
                <td className="text-base-content/70 px-4 py-3">{p.place}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.rating}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "badge badge-sm",
                      p.status.toLowerCase() === "active"
                        ? "badge-primary"
                        : "badge-ghost",
                    )}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.visible ? "text-green-500" : "text-base-content/30"
                    }
                  >
                    {p.visible ? "visible" : "hidden"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleResults.length === 0 && (
          <p className="text-base-content/50 py-6 text-center">
            No players match the current filters
          </p>
        )}
        {visibleResults.length < results.length && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setVisibleCount((prev) => prev + 50)}
            >
              Show more (remaining {results.length - visibleResults.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
