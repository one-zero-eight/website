import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_level } from "@/api/room-booking/types";
import { Link } from "@tanstack/react-router";
import React from "react";

export function RoomsList() {
  const { data: rooms, isPending } = $roomBooking.useQuery("get", "/rooms/");

  const accessLevelColors: Record<RoomAccess_level, string> = {
    [RoomAccess_level.yellow]: "#FFD700", // Gold
    [RoomAccess_level.red]: "#FF4500", // OrangeRed
    [RoomAccess_level.special]: "#ac72e4", // Violet
  };

  if (isPending) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-primary-hover bg-primary animate-pulse rounded-lg border px-4 py-2"
          >
            <div className="bg-muted mb-2 h-6 w-3/4 rounded-sm"></div>
            <div className="space-y-1">
              <div className="bg-muted h-4 w-1/2 rounded-sm"></div>
              <div className="bg-muted h-4 w-1/3 rounded-sm"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
        <h2 className="text-inactive text-2xl">No rooms available</h2>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
      {rooms.map((room, i) => (
        <React.Fragment key={room.id}>
          <Link
            to="/room-booking/rooms/$room"
            params={{ room: room.id }}
            className="group border-primary-hover bg-primary hover:bg-primary-hover flex flex-row rounded-lg border px-4 py-2 transition-colors"
          >
            <div className="flex grow flex-col">
              <h2 className="mb-3 text-gray-900 dark:text-gray-100">
                {room.title}
              </h2>

              <div className="space-y-3">
                {room.access_level && (
                  <div className="flex flex-row items-center gap-3">
                    <span
                      className="icon-[material-symbols--lock-open-circle-outline] text-lg"
                      style={{ color: accessLevelColors[room.access_level] }}
                    />
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">
                        Access Level
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {room.access_level === RoomAccess_level.yellow
                          ? "Yellow (for students)"
                          : room.access_level === RoomAccess_level.red
                            ? "Red (for employees)"
                            : "Special rules apply"}
                      </p>
                    </div>
                  </div>
                )}

                {room.capacity && (
                  <div className="flex flex-row items-center gap-3">
                    <span className="text-foreground icon-[material-symbols--event-seat-outline-rounded] text-lg" />
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">
                        Capacity
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {room.capacity} people
                      </p>
                    </div>
                  </div>
                )}

                {room.restrict_daytime && (
                  <div className="flex flex-row items-center gap-3">
                    <span className="text-foreground icon-[material-symbols--schedule-outline] text-lg" />
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">
                        Time Restrictions
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Students can book only at night (19:00-8:00) and
                        weekends
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="icon-[material-symbols--arrow-forward-ios] text-2xl text-gray-400 dark:text-gray-600" />
            </div>
          </Link>
          {i < rooms.length - 1 && <div className="bg-secondary-hover h-px" />}
        </React.Fragment>
      ))}
    </div>
  );
}
