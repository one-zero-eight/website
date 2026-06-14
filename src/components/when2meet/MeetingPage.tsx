import { FormEvent, useMemo, useState } from "react";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";

type MeetingDate = {
  id: string;
  monthDay: string;
  weekDay: string;
};

type MeetingUser = {
  id: string;
  name: string;
  slots: Set<string>;
};

const MEETING_DATES: MeetingDate[] = [
  { id: "2026-06-16", monthDay: "Jun 16", weekDay: "Tue" },
  { id: "2026-06-17", monthDay: "Jun 17", weekDay: "Wed" },
  { id: "2026-06-18", monthDay: "Jun 18", weekDay: "Thu" },
  { id: "2026-06-19", monthDay: "Jun 19", weekDay: "Fri" },
  { id: "2026-06-26", monthDay: "Jun 26", weekDay: "Fri" },
];

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

const AVAILABLE_ROOMS = [
  { room: "108", capacity: 12, building: "Main building" },
  { room: "303", capacity: 18, building: "Main building" },
  { room: "VK Zone", capacity: 24, building: "Coworking" },
];

function getSlotKey(dateId: string, time: string) {
  return `${dateId}_${time}`;
}

function getInitialUsers(): MeetingUser[] {
  return [
    {
      id: "u-1",
      name: "Mikhail",
      slots: new Set([
        getSlotKey("2026-06-17", "11:30"),
        getSlotKey("2026-06-17", "12:00"),
        getSlotKey("2026-06-17", "12:30"),
        getSlotKey("2026-06-17", "13:00"),
        getSlotKey("2026-06-17", "13:30"),
        getSlotKey("2026-06-18", "11:00"),
        getSlotKey("2026-06-18", "11:30"),
        getSlotKey("2026-06-18", "12:00"),
        getSlotKey("2026-06-18", "12:30"),
        getSlotKey("2026-06-18", "13:00"),
        getSlotKey("2026-06-18", "14:00"),
      ]),
    },
    {
      id: "u-2",
      name: "Anna",
      slots: new Set([
        getSlotKey("2026-06-18", "10:30"),
        getSlotKey("2026-06-18", "11:00"),
        getSlotKey("2026-06-18", "11:30"),
        getSlotKey("2026-06-18", "12:00"),
        getSlotKey("2026-06-18", "12:30"),
        getSlotKey("2026-06-18", "13:00"),
        getSlotKey("2026-06-19", "11:00"),
        getSlotKey("2026-06-19", "11:30"),
        getSlotKey("2026-06-19", "12:00"),
        getSlotKey("2026-06-19", "13:30"),
        getSlotKey("2026-06-19", "14:30"),
      ]),
    },
    {
      id: "u-3",
      name: "Daniil",
      slots: new Set([
        getSlotKey("2026-06-18", "12:00"),
        getSlotKey("2026-06-18", "12:30"),
        getSlotKey("2026-06-18", "13:00"),
        getSlotKey("2026-06-18", "13:30"),
        getSlotKey("2026-06-19", "11:30"),
        getSlotKey("2026-06-19", "12:00"),
        getSlotKey("2026-06-19", "12:30"),
        getSlotKey("2026-06-19", "13:00"),
        getSlotKey("2026-06-19", "13:30"),
        getSlotKey("2026-06-19", "14:00"),
      ]),
    },
  ];
}

function getSlotTone(count: number, maxCount: number) {
  if (count === 0) {
    return "bg-base-100 hover:bg-primary/10";
  }

  const ratio = count / maxCount;

  if (ratio >= 1) {
    return "bg-secondary text-secondary-content hover:bg-secondary/90";
  }

  if (ratio >= 0.67) {
    return "bg-secondary/70 hover:bg-secondary/80";
  }

  if (ratio >= 0.34) {
    return "bg-secondary/45 hover:bg-secondary/55";
  }

  return "bg-secondary/20 hover:bg-secondary/30";
}

function formatSlotSummary(slots: Set<string>) {
  if (slots.size === 0) {
    return "No time selected";
  }

  const firstSlot = [...slots].sort()[0];
  const [dateId, time] = firstSlot.split("_");
  const date = MEETING_DATES.find((meetingDate) => meetingDate.id === dateId);

  return `${date?.monthDay ?? dateId}, ${time} and ${slots.size - 1} more`;
}

function MeetingHeatmap({
  dates,
  users,
  viewedUserIds,
  activeUserId,
  onToggleSlot,
}: {
  dates: MeetingDate[];
  users: MeetingUser[];
  viewedUserIds: Set<string>;
  activeUserId: string;
  onToggleSlot: (dateId: string, time: string) => void;
}) {
  const viewedUsers = users.filter((user) => viewedUserIds.has(user.id));
  const activeUser = users.find((user) => user.id === activeUserId);
  const maxCount = Math.max(1, viewedUsers.length);

  function getSlotCount(dateId: string, time: string) {
    const slotKey = getSlotKey(dateId, time);
    return viewedUsers.filter((user) => user.slots.has(slotKey)).length;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className={cn(
          "grid min-w-[700px] grid-cols-[4.25rem_repeat(5,minmax(7rem,1fr))]",
          dates.length === 3 &&
            "min-w-[420px] grid-cols-[3.75rem_repeat(3,minmax(5.5rem,1fr))]",
        )}
      >
        <div />
        {dates.map((date) => (
          <div key={date.id} className="pb-3 text-center">
            <div className="text-base-content/70 text-sm md:text-base">
              {date.monthDay}
            </div>
            <div className="text-xl font-medium md:text-3xl">
              {date.weekDay}
            </div>
          </div>
        ))}

        {TIME_SLOTS.map((time) => (
          <div key={time} className="contents">
            <div
              className={cn(
                "text-base-content/80 h-8 pr-2 text-right text-sm md:text-xl",
                time.endsWith(":30") && "text-transparent",
              )}
            >
              {time}
            </div>
            {dates.map((date) => {
              const slotKey = getSlotKey(date.id, time);
              const slotCount = getSlotCount(date.id, time);
              const isActiveUserSlot = activeUser?.slots.has(slotKey);

              return (
                <button
                  key={slotKey}
                  type="button"
                  className={cn(
                    "border-base-300 h-8 border-t border-r border-dashed transition-colors first:border-l",
                    time.endsWith(":00") && "border-solid",
                    getSlotTone(slotCount, maxCount),
                    isActiveUserSlot &&
                      "ring-primary ring-2 ring-offset-0 ring-inset",
                  )}
                  title={`${date.monthDay}, ${time}: ${slotCount} responses`}
                  onClick={() => onToggleSlot(date.id, time)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomsModal({
  open,
  onOpenChange,
  selectedSlot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: string;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Available rooms"
      containerClassName="max-w-md"
    >
      <div className="text-base-content/70 text-sm">
        Mock rooms for {selectedSlot}. Booking is not connected yet.
      </div>
      <div className="grid gap-2">
        {AVAILABLE_ROOMS.map((room) => (
          <div
            key={room.room}
            className="border-base-300 bg-base-100 rounded-box flex items-center justify-between border p-3"
          >
            <div>
              <div className="font-semibold">Room {room.room}</div>
              <div className="text-base-content/60 text-sm">
                {room.building}
              </div>
            </div>
            <div className="badge badge-primary">{room.capacity} seats</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function MeetingPage({
  meetingId,
  initialName,
}: {
  meetingId: string;
  initialName?: string;
}) {
  const { showSuccess } = useToast();
  const [users, setUsers] = useState(getInitialUsers);
  const [viewedUserIds, setViewedUserIds] = useState(
    new Set(getInitialUsers().map((user) => user.id)),
  );
  const [activeUserId, setActiveUserId] = useState("u-1");
  const [newUserName, setNewUserName] = useState("");
  const [dateOffset, setDateOffset] = useState(0);
  const [roomsOpen, setRoomsOpen] = useState(false);

  const meetingName = initialName ?? "Project sync - Innohassle";
  const mobileDates = MEETING_DATES.slice(dateOffset, dateOffset + 3);
  const selectedSlot = useMemo(() => {
    let bestSlot = getSlotKey(MEETING_DATES[0].id, TIME_SLOTS[0]);
    let bestCount = 0;

    MEETING_DATES.forEach((date) => {
      TIME_SLOTS.forEach((time) => {
        const slotKey = getSlotKey(date.id, time);
        const count = users.filter((user) => user.slots.has(slotKey)).length;

        if (count > bestCount) {
          bestSlot = slotKey;
          bestCount = count;
        }
      });
    });

    const [dateId, time] = bestSlot.split("_");
    const date = MEETING_DATES.find((meetingDate) => meetingDate.id === dateId);

    return `${date?.monthDay ?? dateId}, ${time}`;
  }, [users]);

  function handleToggleSlot(dateId: string, time: string) {
    const slotKey = getSlotKey(dateId, time);

    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== activeUserId) {
          return user;
        }

        const nextSlots = new Set(user.slots);

        if (nextSlots.has(slotKey)) {
          nextSlots.delete(slotKey);
        } else {
          nextSlots.add(slotKey);
        }

        return { ...user, slots: nextSlots };
      }),
    );
  }

  function handleToggleViewedUser(userId: string) {
    setViewedUserIds((currentUserIds) => {
      const nextUserIds = new Set(currentUserIds);

      if (nextUserIds.has(userId)) {
        nextUserIds.delete(userId);
      } else {
        nextUserIds.add(userId);
      }

      return nextUserIds;
    });
  }

  function handleDeleteUser(userId: string) {
    setUsers((currentUsers) =>
      currentUsers.filter((user) => user.id !== userId),
    );
    setViewedUserIds((currentUserIds) => {
      const nextUserIds = new Set(currentUserIds);
      nextUserIds.delete(userId);
      return nextUserIds;
    });

    if (activeUserId === userId) {
      const nextUser = users.find((user) => user.id !== userId);
      setActiveUserId(nextUser?.id ?? "");
    }
  }

  function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newUserName.trim();

    if (!trimmedName) {
      return;
    }

    const newUser = {
      id: `u-${Date.now().toString(36)}`,
      name: trimmedName,
      slots: new Set<string>(),
    };

    setUsers((currentUsers) => [...currentUsers, newUser]);
    setViewedUserIds((currentUserIds) =>
      new Set(currentUserIds).add(newUser.id),
    );
    setActiveUserId(newUser.id);
    setNewUserName("");
  }

  return (
    <>
      <div className="mx-auto mb-20 grid w-full max-w-[1400px] gap-5 px-4 py-4">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {meetingName}
              </h1>
              <a
                href={`/when2meet/${meetingId}`}
                className="link link-primary text-sm font-medium"
              >
                Edit event
              </a>
            </div>
            <div className="text-base-content/70 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>Jun 16 - Jun 26</span>
              <span>{users.length} responses</span>
              <span>Best time: {selectedSlot}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                showSuccess(
                  "Link copied",
                  "Mock share link is ready for the clipboard flow.",
                )
              }
            >
              <span className="icon-[material-symbols--ios-share-outline] text-lg" />
              Share link
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setRoomsOpen(true)}
            >
              <span className="icon-[mdi--door-open] text-lg" />
              Book room
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-base-100 border-base-300 rounded-box border p-3 md:p-5">
            <div className="mb-3 flex items-center justify-between md:hidden">
              <div className="text-sm font-medium">
                {mobileDates[0].monthDay} -{" "}
                {mobileDates[mobileDates.length - 1].monthDay}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-circle btn-outline btn-sm"
                  disabled={dateOffset === 0}
                  onClick={() =>
                    setDateOffset((offset) => Math.max(0, offset - 1))
                  }
                >
                  <span className="icon-[material-symbols--chevron-left] text-xl" />
                </button>
                <button
                  type="button"
                  className="btn btn-circle btn-outline btn-sm"
                  disabled={dateOffset >= MEETING_DATES.length - 3}
                  onClick={() =>
                    setDateOffset((offset) =>
                      Math.min(MEETING_DATES.length - 3, offset + 1),
                    )
                  }
                >
                  <span className="icon-[material-symbols--chevron-right] text-xl" />
                </button>
              </div>
            </div>

            <div className="md:hidden">
              <MeetingHeatmap
                dates={mobileDates}
                users={users}
                viewedUserIds={viewedUserIds}
                activeUserId={activeUserId}
                onToggleSlot={handleToggleSlot}
              />
            </div>
            <div className="hidden md:block">
              <MeetingHeatmap
                dates={MEETING_DATES}
                users={users}
                viewedUserIds={viewedUserIds}
                activeUserId={activeUserId}
                onToggleSlot={handleToggleSlot}
              />
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="bg-base-100 border-base-300 rounded-box border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Responses</h2>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() =>
                    setViewedUserIds(new Set(users.map((user) => user.id)))
                  }
                >
                  View all
                </button>
              </div>

              <div className="grid gap-2">
                {users.map((user) => {
                  const isViewed = viewedUserIds.has(user.id);
                  const isActive = activeUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "border-base-300 rounded-box grid gap-2 border p-3",
                        isActive && "border-primary bg-primary/10",
                      )}
                    >
                      <button
                        type="button"
                        className="grid min-w-0 text-left"
                        onClick={() => handleToggleViewedUser(user.id)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              isViewed ? "bg-secondary" : "bg-base-300",
                            )}
                          />
                          <span className="truncate font-medium">
                            {user.name}
                          </span>
                        </span>
                        <span className="text-base-content/60 truncate text-sm">
                          {formatSlotSummary(user.slots)}
                        </span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={cn(
                            "btn btn-xs grow",
                            isActive ? "btn-primary" : "btn-outline",
                          )}
                          onClick={() => setActiveUserId(user.id)}
                        >
                          Edit time
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-error btn-xs"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <span className="icon-[material-symbols--delete-outline] text-lg" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={handleAddUser}
              className="bg-base-100 border-base-300 rounded-box grid gap-3 border p-4"
            >
              <h2 className="text-lg font-semibold">Add user</h2>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Participant name"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <span className="icon-[material-symbols--person-add-outline] text-lg" />
                Add user
              </button>
              <p className="text-base-content/60 text-sm">
                Click cells in the heatmap to change the editing user&apos;s
                time.
              </p>
            </form>
          </aside>
        </section>
      </div>

      <RoomsModal
        open={roomsOpen}
        onOpenChange={setRoomsOpen}
        selectedSlot={selectedSlot}
      />
    </>
  );
}
