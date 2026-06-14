import type { Meeting } from "./mock-data.ts";

export function MeetingItem({ meeting }: { meeting: Meeting }) {
  return (
    <div className="card card-border bg-base-200 hover:border-primary/30 flex h-full cursor-pointer flex-col transition">
      <div className="card-body flex grow flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{meeting.title}</h3>
          <p className="text-base-content/70 line-clamp-2 text-sm">
            {meeting.description}
          </p>
        </div>

        <div className="text-base-content/70 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="icon-[mdi--door-open] text-primary shrink-0 text-xl" />
            <span>Room {meeting.room}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="icon-[mdi--account-group-outline] text-primary shrink-0 text-xl" />
            <span>{meeting.participantsCount} participants</span>
          </div>
        </div>
      </div>
    </div>
  );
}
