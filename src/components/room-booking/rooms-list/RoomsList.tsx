import { $roomBooking } from "@/api/room-booking";
import {
  accessLevelLabel,
  capacityPeopleLabel,
} from "@/components/room-booking/access-level-label.ts";
import { AccessLevelIcon } from "@/components/room-booking/AccessLevelIcon.tsx";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";

export function RoomsList() {
  useLingui();
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: {
      query: {
        include_red: true,
      },
    },
  });

  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
        <h2 className="text-base-content/70 text-2xl">
          <Trans>No rooms available</Trans>
        </h2>
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
                  <AccessLevelIcon
                    accessLevel={room.access_level}
                    className="text-3xl"
                  />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      <Trans>Access Level</Trans>
                    </p>
                    <p className="text-base-content/70 text-sm">
                      {accessLevelLabel(room.access_level)}
                    </p>
                  </div>
                </div>
              )}

              {room.capacity && (
                <div className="flex flex-row items-center gap-3">
                  <span className="text-base-content icon-[material-symbols--event-seat-outline-rounded] text-3xl" />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      <Trans>Capacity</Trans>
                    </p>
                    <p className="text-base-content/70 text-sm">
                      {capacityPeopleLabel(room.capacity)}
                    </p>
                  </div>
                </div>
              )}

              {room.restrict_daytime && (
                <div className="flex flex-row items-center gap-3">
                  <span className="text-base-content icon-[material-symbols--schedule-outline] text-3xl" />
                  <div className="flex-1">
                    <p className="text-base-content text-sm font-medium">
                      <Trans>Time Restrictions</Trans>
                    </p>
                    <p className="text-base-content/70 text-sm">
                      <Trans>
                        Students can book only at night (19:00-8:00) and
                        weekends
                      </Trans>
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
