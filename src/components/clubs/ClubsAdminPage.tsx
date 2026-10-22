import { plural } from "@lingui/core/macro";
import { $clubs } from "@/api/clubs";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  createFuseInstance,
  searchClubs,
} from "@/components/clubs/searchUtils.ts";
import { useMemo, useState } from "react";
import { AddClubDialog } from "./AddClubDialog";
import { ClubAdminCard } from "./ClubAdminCard";

export function ClubsAdminPage() {
  const { t } = useLingui();
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const { data: clubs, isPending } = $clubs.useQuery("get", "/clubs/");
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fuse = useMemo(
    () => clubs && createFuseInstance(clubs, clubLeaders),
    [clubs, clubLeaders],
  );

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];

    let foundClubs = clubs;
    const trimmedSearch = search.trim();
    if (trimmedSearch && fuse) {
      foundClubs = searchClubs(fuse, trimmedSearch);
    }

    return foundClubs;
  }, [clubs, fuse, search]);

  if (clubsUser?.role !== "admin") {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/50 text-lg">
          <Trans>Loading clubs...</Trans>
        </div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-base-content/50 text-lg">
          <Trans>No clubs found</Trans>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="btn btn-primary"
        >
          <span className="icon-[mdi--plus] size-5" />
          <span>
            <Trans>Add New Club</Trans>
          </span>
        </button>
        <AddClubDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

  const count = filteredClubs.length;
  const countLabel = search
    ? t`${plural(count, {
        one: "# club found",
        other: "# clubs found",
      })}`
    : t`${plural(count, { one: "# club", other: "# clubs" })}`;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:max-w-md sm:grow">
            <div className="border-base-300 focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0">
              <input
                type="text"
                placeholder={t`Search clubs...`}
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
            <span>
              <Trans>Add New Club</Trans>
            </span>
          </button>
        </div>

        <div className="text-base-content/70 text-sm">{countLabel}</div>

        {filteredClubs.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-base-content/30 text-lg">
              <Trans>No clubs match your search</Trans>
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
