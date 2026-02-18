import { $clubs } from "@/api/clubs";
import {
  createFuseInstance,
  searchClubs,
} from "@/components/clubs/searchUtils.ts";
import { useMemo, useState } from "react";
import { AddClubDialog } from "./AddClubDialog";
import { ClubAdminCard } from "./ClubAdminCard";

export function ClubsAdminPage() {
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const { data: clubs, isPending } = $clubs.useQuery("get", "/clubs/");
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

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

    return foundClubs;
  }, [clubs, fuse, search]);

  if (clubsUser?.role !== "admin") {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/50 text-lg">Loading clubs...</div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-base-content/50 text-lg">No clubs found</div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="btn btn-primary"
        >
          <span className="icon-[mdi--plus] size-5" />
          <span>Add New Club</span>
        </button>
        <AddClubDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:max-w-md sm:grow">
            <div className="border-base-300 focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0">
              <input
                type="text"
                placeholder="Search clubs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 grow bg-transparent px-2 py-1 outline-hidden"
              />
              <span className="icon-[material-symbols--search-rounded] text-base-300 shrink-0 text-2xl" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="btn btn-primary"
          >
            <span className="icon-[mdi--plus] size-5" />
            <span>Add New Club</span>
          </button>
        </div>

        <div className="text-base-content/70 text-sm">
          <span className="font-semibold">{filteredClubs.length}</span>{" "}
          {filteredClubs.length === 1 ? "club" : "clubs"}
          {search && " found"}
        </div>

        {filteredClubs.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-base-content/30 text-lg">
              No clubs match your search
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredClubs.map((club) => (
              <ClubAdminCard key={club.id} club={club} />
            ))}
          </div>
        )}
      </div>

      <AddClubDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  );
}
