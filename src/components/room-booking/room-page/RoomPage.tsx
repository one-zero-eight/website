import { $maps } from "@/api/maps";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_level } from "@/api/room-booking/types";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomCalendar } from "@/components/room-booking/room-page/RoomCalendar.tsx";
import { RoomMapPreview } from "@/components/room-booking/room-page/RoomMapPreview.tsx";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useCopyToClipboard } from "usehooks-ts";

export function RoomPage({ id }: { id: string }) {
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");
  const room = rooms?.find((r) => r.id === id);
  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<any>();

  // Get maps data for navigation
  const { data: scenes } = $maps.useQuery("get", "/scenes/");
  const { data: searchResult } = $maps.useQuery(
    "get",
    "/scenes/areas/search",
    {
      params: { query: { query: id } },
    },
    {
      enabled: !!id,
    },
  );

  const roomArea = useMemo(() => {
    if (!searchResult || searchResult.length === 0) return null;

    // Find the area that matches the room ID
    const matchingArea = searchResult.find(
      (result) => result.area.room_booking_id === id,
    );

    return matchingArea ? matchingArea.area : null;
  }, [searchResult, id]);

  const sceneWithRoom = useMemo(() => {
    if (!scenes || !searchResult || searchResult.length === 0) return null;

    // Find the scene that contains the room
    const matchingResult = searchResult.find(
      (result) => result.area.room_booking_id === id,
    );

    if (!matchingResult) return null;

    return scenes.find((scene) => scene.scene_id === matchingResult.scene_id);
  }, [scenes, searchResult, id]);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: room?.title || "Room Details",
          text: `Check out this room: ${room?.title}`,
          url: url,
        });
      } catch {
        // User cancelled sharing or error occurred, fallback to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (url: string) => {
    _copy(url).then((ok) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (ok) {
        setCopied(true);
        setTimer(setTimeout(() => setCopied(false), 1500));
      } else {
        setCopied(false);
      }
    });
  };

  if (!room) {
    return <Topbar title="Room" />;
  }

  const accessLevelColors: Record<RoomAccess_level, string> = {
    [RoomAccess_level.yellow]: "#FFD700", // Gold
    [RoomAccess_level.red]: "#FF4500", // OrangeRed
    [RoomAccess_level.special]: "#ac72e4", // Violet
  };

  return (
    <>
      <Helmet>
        <title>{room.title}</title>
        <meta name="description" content={room.title ?? undefined} />
      </Helmet>

      <Topbar title="Room details" />
      <BookingPageTabs />

      <div className="p-4">
        {/* Two-column layout on large screens */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Room details column */}
          <div className="flex min-h-full grow flex-col gap-3 lg:flex-1">
            <h1 className="text-3xl font-semibold">{room.title}</h1>

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
                    Students can book only at night (19:00-8:00) and weekends
                  </p>
                </div>
              </div>
            )}

            {/* Share button */}
            <div className="flex flex-row items-center gap-3">
              <div className="flex-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className={`border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? "text-green-700 dark:text-green-500"
                      : "text-foreground"
                  }`}
                >
                  <span className="icon-[material-symbols--share-outline] text-base" />
                  {copied ? "Link copied!" : "Share this room"}
                </button>
              </div>
            </div>

            {/* View on Map link - visible only on mobile */}
            <div className="flex flex-row items-center gap-3 lg:hidden">
              <div className="flex-1">
                <Link
                  to="/maps"
                  search={
                    sceneWithRoom && roomArea
                      ? {
                          scene: sceneWithRoom.scene_id,
                          area: roomArea.svg_polygon_id ?? undefined,
                        }
                      : undefined
                  }
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                >
                  <span className="icon-[material-symbols--map-outline] text-base" />
                  View on Map
                </Link>
              </div>
            </div>
          </div>

          {/* Map column - visible only on desktop */}
          <div className="hidden lg:flex lg:flex-1">
            <RoomMapPreview roomId={room.id} />
          </div>
        </div>
      </div>

      <div className="p-4">
        <RoomCalendar roomId={room.id} />
      </div>
    </>
  );
}
