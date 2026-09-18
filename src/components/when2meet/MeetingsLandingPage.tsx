import { $when2meet } from "@/api/when2meet";
import { MeetingStatus } from "@/api/when2meet/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { useMemo, useState } from "react";
import { CreateMeetingButton } from "./CreateMeetingButton.tsx";
import { MeetingItem } from "./MeetingItem.tsx";
import { MeetingsMobileBar } from "./MeetingsMobileBar.tsx";

function MeetingsSearchBar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <label className="input input-primary w-full focus:outline-none">
      <span className="icon-[material-symbols--search] text-base-content/50" />
      <input
        type="text"
        placeholder="Search meeting name..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="grow"
      />
    </label>
  );
}

function filterMeetings<
  T extends { name: string; description?: string | null },
>(meetings: T[], search: string) {
  const trimmedSearch = search.trim().toLowerCase();

  if (!trimmedSearch) {
    return meetings;
  }

  return meetings.filter(
    (meeting) =>
      meeting.name.toLowerCase().includes(trimmedSearch) ||
      meeting.description?.toLowerCase().includes(trimmedSearch),
  );
}

function MeetingsSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="skeleton h-36 w-full" />
      ))}
    </div>
  );
}

export function MeetingsLandingPage({ status }: { status: MeetingStatus }) {
  const [search, setSearch] = useState("");

  const {
    data: ownedMeetings = [],
    isPending: isOwnedPending,
    isError: isOwnedError,
    error: ownedError,
    refetch: refetchOwned,
  } = $when2meet.useQuery("get", "/meetings/", {
    params: { query: { status } },
  });

  const {
    data: participatingMeetings = [],
    isPending: isParticipatingPending,
    isError: isParticipatingError,
    error: participatingError,
    refetch: refetchParticipating,
  } = $when2meet.useQuery("get", "/meetings/participating", {
    params: { query: { status } },
  });

  const filteredOwnedMeetings = useMemo(
    () => filterMeetings(ownedMeetings, search),
    [ownedMeetings, search],
  );

  const filteredParticipatingMeetings = useMemo(
    () => filterMeetings(participatingMeetings, search),
    [participatingMeetings, search],
  );

  const isArchived = status === MeetingStatus.archived;

  return (
    <RequireAuth>
      <>
        <div className="mx-auto mb-[90px] w-full max-w-[1200px] px-4 md:mb-4">
          <div className="my-4 md:my-8">
            <MeetingsSearchBar search={search} onSearchChange={setSearch} />
          </div>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">My meetings</h2>
              <CreateMeetingButton className="hidden md:inline-flex">
                Create meeting
              </CreateMeetingButton>
            </div>

            {isOwnedError && (
              <div className="alert alert-error mb-4">
                <span>{formatApiErrorMessage(ownedError)}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => refetchOwned()}
                >
                  Retry
                </button>
              </div>
            )}

            {isOwnedError ? null : isOwnedPending ? (
              <MeetingsSkeletonGrid />
            ) : filteredOwnedMeetings.length === 0 ? (
              <div className="text-base-content/50 py-8 text-center text-sm">
                {search.trim()
                  ? "No meetings match your search."
                  : isArchived
                    ? "You have no archived meetings."
                    : "You have no active meetings."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOwnedMeetings.map((meeting) => (
                  <MeetingItem key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Participating in</h2>

            {isParticipatingError && (
              <div className="alert alert-error mb-4">
                <span>{formatApiErrorMessage(participatingError)}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => refetchParticipating()}
                >
                  Retry
                </button>
              </div>
            )}

            {isParticipatingError ? null : isParticipatingPending ? (
              <MeetingsSkeletonGrid />
            ) : filteredParticipatingMeetings.length === 0 ? (
              <div className="text-base-content/50 py-8 text-center text-sm">
                {search.trim()
                  ? "No meetings match your search."
                  : isArchived
                    ? "You have no archived meetings you participated in."
                    : "You are not participating in any active meetings."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredParticipatingMeetings.map((meeting) => (
                  <MeetingItem key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </section>
        </div>

        <MeetingsMobileBar />
      </>
    </RequireAuth>
  );
}
