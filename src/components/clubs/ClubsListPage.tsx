import { $clubs, clubsTypes } from "@/api/clubs";
import { useMemo, useState } from "react";
import { ClubCard } from "./ClubCard";
import { ClubsSidebar } from "./ClubsSidebar";
import { clubTypesOrder, getClubTypeLabel } from "./utils";

export function ClubsListPage() {
  const { data: clubs, isPending } = $clubs.useQuery("get", "/clubs/");
  const { data: _clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<clubsTypes.ClubType>>(
    new Set(),
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredAndSortedClubs = useMemo(() => {
    if (!clubs) return [];

    return clubs.filter((club) => {
      const matchesType =
        selectedTypes.has(club.type) || selectedTypes.size === 0;
      const matchesSearch =
        search === "" ||
        club.title.toLowerCase().includes(search.toLowerCase()) ||
        club.short_description.toLowerCase().includes(search.toLowerCase()) ||
        club.description.toLowerCase().includes(search.toLowerCase());
      return club.is_active && matchesType && matchesSearch;
    });
  }, [clubs, search, selectedTypes]);

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
        <div className="text-inh-inactive text-lg">Loading clubs...</div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inh-inactive text-lg">No clubs found</div>
      </div>
    );
  }

  const groupedClubs = clubTypesOrder.reduce(
    (acc, type) => {
      const clubsOfType = filteredAndSortedClubs.filter(
        (club) => club.type === type,
      );
      if (clubsOfType.length > 0) {
        acc[type] = clubsOfType;
      }
      return acc;
    },
    {} as Record<clubsTypes.ClubType, typeof filteredAndSortedClubs>,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
      <ClubsSidebar
        search={search}
        setSearch={setSearch}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
        totalCount={filteredAndSortedClubs.length}
        mobileFiltersOpen={mobileFiltersOpen}
        setMobileFiltersOpen={setMobileFiltersOpen}
      />

      {filteredAndSortedClubs.length === 0 ? (
        <div className="flex min-h-[400px] grow items-center justify-center">
          <div className="text-inh-inactive text-lg">No clubs found</div>
        </div>
      ) : (
        <div className="flex grow flex-col gap-6">
          {Object.entries(groupedClubs).map(([type, clubsOfType]) => (
            <div key={type}>
              <h2 className="text-base-content mb-4 text-xl font-semibold">
                {getClubTypeLabel(type as clubsTypes.ClubType)}
              </h2>
              <div className="flex flex-col gap-6">
                {clubsOfType.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
