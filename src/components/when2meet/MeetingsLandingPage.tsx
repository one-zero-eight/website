import { useMemo, useState } from "react";
import { CreateMeetingButton } from "./CreateMeetingButton.tsx";
import { MeetingItem } from "./MeetingItem.tsx";
import { MeetingsMobileBar } from "./MeetingsMobileBar.tsx";
import {
  getOwnedEvents,
  getParticipatingEvents,
} from "./utils/local-events.ts";

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

export function MeetingsLandingPage() {
  const [search, setSearch] = useState("");

  const ownedMeetings = useMemo(() => getOwnedEvents(), []);
  const participatingMeetings = useMemo(() => getParticipatingEvents(), []);

  const filteredOwnedMeetings = useMemo(
    () => filterMeetings(ownedMeetings, search),
    [ownedMeetings, search],
  );

  const filteredParticipatingMeetings = useMemo(
    () => filterMeetings(participatingMeetings, search),
    [participatingMeetings, search],
  );

  return (
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

          {filteredOwnedMeetings.length === 0 ? (
            <div className="text-base-content/50 py-8 text-center text-lg">
              You have not created any meetings yet.
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
          {filteredParticipatingMeetings.length === 0 ? (
            <div className="text-base-content/50 py-8 text-center text-lg">
              You are not participating in any meetings yet.
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
  );
}
