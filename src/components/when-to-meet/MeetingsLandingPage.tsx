import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";
import { CreateMeetingButton } from "./CreateMeetingButton.tsx";
import { MeetingItem } from "./MeetingItem.tsx";
import { MeetingsMobileBar } from "./MeetingsMobileBar.tsx";
import {
  MY_MEETINGS,
  PARTICIPATING_MEETINGS,
  type Meeting,
} from "./mock-data.ts";
import { createFuseMeetings, searchMeetings } from "./search-utils.ts";

function MeetingsSearchBar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <label className="input input-primary w-full focus:outline-none">
      <svg
        className="h-[1em] opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2.5"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </g>
      </svg>
      <input
        type="text"
        placeholder="Search meeting name, room or description..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="grow"
      />
    </label>
  );
}

function MeetingsList({
  meetings,
  emptyText,
}: {
  meetings: Meeting[];
  emptyText: string;
}) {
  if (meetings.length === 0) {
    return (
      <div className="text-base-content/50 py-8 text-center text-lg">
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-5 @lg/content:grid-cols-1 @5xl/content:grid-cols-2",
      )}
    >
      {meetings.map((meeting) => (
        <MeetingItem key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}

export function MeetingsLandingPage() {
  const [search, setSearch] = useState("");

  const myMeetingsFuse = useMemo(() => createFuseMeetings(MY_MEETINGS), []);
  const participatingMeetingsFuse = useMemo(
    () => createFuseMeetings(PARTICIPATING_MEETINGS),
    [],
  );

  const filteredMyMeetings = useMemo(
    () => searchMeetings(myMeetingsFuse, search, MY_MEETINGS),
    [myMeetingsFuse, search],
  );

  const filteredParticipatingMeetings = useMemo(
    () =>
      searchMeetings(participatingMeetingsFuse, search, PARTICIPATING_MEETINGS),
    [participatingMeetingsFuse, search],
  );

  const hasResults =
    filteredMyMeetings.length > 0 || filteredParticipatingMeetings.length > 0;

  return (
    <>
      <div className="mx-auto mb-[90px] w-full max-w-[1200px] px-4 md:mb-4">
        <div className="my-4">
          <MeetingsSearchBar search={search} onSearchChange={setSearch} />
        </div>

        {!hasResults ? (
          <div className="text-base-content/50 py-10 text-center text-xl">
            No meetings found!
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">My meetings</h2>
                <CreateMeetingButton className="hidden md:inline-flex">
                  Create meeting
                </CreateMeetingButton>
              </div>
              <MeetingsList
                meetings={filteredMyMeetings}
                emptyText={
                  search
                    ? "No meetings you created match your search."
                    : "You have not created any meetings yet."
                }
              />
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold">Participating in</h2>
              <MeetingsList
                meetings={filteredParticipatingMeetings}
                emptyText={
                  search
                    ? "No participating meetings match your search."
                    : "You are not participating in any meetings yet."
                }
              />
            </section>
          </div>
        )}
      </div>

      <MeetingsMobileBar />
    </>
  );
}
