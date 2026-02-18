import { $clubs, clubsTypes } from "@/api/clubs";
import {
  createFuseInstance,
  searchClubs,
} from "@/components/clubs/searchUtils.ts";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { ClubCard } from "./ClubCard";
import { ClubsSidebar } from "./ClubsSidebar";
import {
  clubTypeDescription,
  clubTypeIcon,
  clubTypesOrder,
  getClubTypeLabel,
} from "./constants.ts";

export function ClubsListPage() {
  const { data: clubs, isPending } = $clubs.useQuery(
    "get",
    "/clubs/",
    {},
    {
      select: (data) => {
        // Make one-zero-eight first, then BDSM, then other clubs
        const sorted = data.slice();
        sorted.sort((a, b) => {
          if (a.slug === "one-zero-eight") return -1;
          if (b.slug === "one-zero-eight") return 1;
          if (a.slug === "boosting-development-in-science-and-math") return -1;
          if (b.slug === "boosting-development-in-science-and-math") return 1;
          return 0;
        });
        return sorted;
      },
    },
  );
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<clubsTypes.ClubType>>(
    new Set(),
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const fuse = useMemo(
    () => clubs && clubLeaders && createFuseInstance(clubs, clubLeaders),
    [clubs, clubLeaders],
  );

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];

    let foundClubs = clubs;
    if (search && fuse) {
      foundClubs = searchClubs(fuse, search);
    }

    return foundClubs.filter(
      (club) =>
        club.is_active &&
        (selectedTypes.has(club.type) || selectedTypes.size === 0),
    );
  }, [clubs, fuse, search, selectedTypes]);

  const handleTypeToggle = (type: clubsTypes.ClubType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">Loading clubs...</div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">No clubs found</div>
      </div>
    );
  }

  const groupedClubs = clubTypesOrder.reduce(
    (acc, type) => {
      const clubsOfType = filteredClubs.filter((club) => club.type === type);
      if (clubsOfType.length > 0) {
        acc[type] = clubsOfType;
      }
      return acc;
    },
    {} as Record<clubsTypes.ClubType, typeof filteredClubs>,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
      <ClubsSidebar
        search={search}
        setSearch={setSearch}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
        totalCount={filteredClubs.length}
        mobileFiltersOpen={mobileFiltersOpen}
        setMobileFiltersOpen={setMobileFiltersOpen}
      />

      {filteredClubs.length === 0 ? (
        <div className="flex min-h-[400px] grow items-center justify-center">
          <div className="text-base-content/30 text-lg">No clubs found</div>
        </div>
      ) : (
        <div className="flex grow flex-col gap-6">
          {!search ? (
            Object.entries(groupedClubs).map(([type, clubsOfType]) => (
              <div key={type}>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      clubTypeIcon[type as clubsTypes.ClubType],
                      "text-primary text-3xl",
                    )}
                  />
                  <h2 className="text-base-content text-xl font-semibold">
                    {getClubTypeLabel(type as clubsTypes.ClubType)}
                  </h2>
                  <div className="grow" />
                  <span className="text-base-content/50 text-sm">
                    {clubsOfType.length} clubs
                  </span>
                </div>
                <span className="text-base-content/50">
                  {clubTypeDescription[type as clubsTypes.ClubType]}
                </span>
                <div className="mt-4 flex flex-col gap-6">
                  {clubsOfType.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div>
              <div className="mt-4 flex flex-col gap-6">
                {filteredClubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
