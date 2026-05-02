import { accessLevelColors } from "@/components/room-booking/AccessLevelIcon";
import { Link } from "@tanstack/react-router";
import type { Room } from "./types";

const PLACEHOLDER_ROOMS_DEFAULT_COUNT = 18;
const PLACEHOLDER_ROOMS = Array.from<string>({
  length: PLACEHOLDER_ROOMS_DEFAULT_COUNT,
}).fill("placeholder");

export function RoomList({
  rooms,
  roomsLoading,
  scrollY,
  compactMode,
  containerHeight,
  sidebarWidth,
  headerHeight,
  rowHeight,
}: {
  rooms: Room[];
  roomsLoading: boolean;
  scrollY: number;
  compactMode: boolean;
  containerHeight: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
}) {
  const displayRooms = roomsLoading ? PLACEHOLDER_ROOMS : rooms;

  return (
    <div
      className="bg-base-100 absolute left-0 flex flex-col overflow-hidden"
      style={{
        top: headerHeight,
        width: sidebarWidth,
        height: containerHeight - headerHeight,
        zIndex: 4,
      }}
    >
      <div
        className="flex flex-col"
        style={{
          transform: `translateY(${-scrollY}px)`,
          willChange: "transform",
        }}
      >
        {displayRooms.map((room, i) => {
          const isPlaceholder = room === "placeholder";
          const actualRoom = isPlaceholder ? null : (room as Room);

          return (
            <div
              key={isPlaceholder ? `placeholder-${i}` : actualRoom!.id}
              className="bg-base-100 flex items-stretch"
              style={{ height: rowHeight }}
            >
              <div
                className="bg-base-200/50 border-base-300 text-base-content/50 relative flex w-full items-center border-r px-3"
                style={{
                  borderBottomWidth: i < displayRooms.length - 1 ? 1 : 0,
                  borderBottomStyle: "solid",
                }}
              >
                {/* Color-coded left border */}
                <span
                  className="absolute top-[10%] left-0 h-4/5 w-0.5"
                  style={{
                    backgroundColor: isPlaceholder
                      ? "var(--color-base-content/30)"
                      : actualRoom!.access_level
                        ? accessLevelColors[actualRoom!.access_level]
                        : "var(--color-base-content/30)",
                  }}
                />

                {isPlaceholder ? (
                  <span className="skeleton h-4 w-full rounded-md" />
                ) : (
                  <Link
                    to="/room-booking/rooms/$room"
                    params={{ room: actualRoom!.id }}
                    className="truncate hover:underline"
                  >
                    {compactMode ? actualRoom!.short_name : actualRoom!.title}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
