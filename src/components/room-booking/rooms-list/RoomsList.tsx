import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_level } from "@/api/room-booking/types";
import { Link } from "@tanstack/react-router";

export function RoomsList() {
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: {
      query: {
        include_red: true,
      },
    },
  });

  const accessLevelColors: Record<RoomAccess_level, string> = {
    [RoomAccess_level.yellow]: "#FFD700", // Gold
    [RoomAccess_level.red]: "#FF4500", // OrangeRed
    [RoomAccess_level.special]: "#ac72e4", // Violet
  };

  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
        <h2 className="text-base-content/70 text-2xl">No rooms available</h2>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
      {rooms.map((room) => (
        <Link
          to="/room-booking/rooms/$room"
          params={{ room: room.id }}
          className="group bg-base-200 hover:bg-base-300 rounded-field flex flex-row px-4 py-2 transition-colors"
          key={room.id}
        >
          <div className="flex grow flex-col">
            <h2 className="text-base-content mb-3 font-medium">{room.title}</h2>

            <div className="space-y-3">
              {room.access_level && (
                <div className="flex flex-row items-center gap-3">
                  <span
                    className="icon-[material-symbols--lock-open-circle-outline] text-3xl"
                    style={{ color: accessLevelColors[room.access_level] }}
                  />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      Access Level
                    </p>
                    <p className="text-base-content/70 text-sm">
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
                  <span className="text-base-content icon-[material-symbols--event-seat-outline-rounded] text-3xl" />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      Capacity
                    </p>
                    <p className="text-base-content/70 text-sm">
                      {room.capacity} people
                    </p>
                  </div>
                </div>
              )}

              {room.restrict_daytime && (
                <div className="flex flex-row items-center gap-3">
                  <span className="text-base-content icon-[material-symbols--schedule-outline] text-3xl" />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      Time Restrictions
                    </p>
                    <p className="text-base-content/70 text-sm">
                      Students can book only at night (19:00-8:00) and weekends
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="icon-[material-symbols--arrow-forward-ios] text-base-content/50 text-2xl" />
          </div>
        </Link>
      ))}
    </div>
  );
}
