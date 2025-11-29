import { $maps } from "@/api/maps";
import { MapView } from "@/components/maps/viewer/MapView.tsx";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

export function RoomMapPreview({ roomId }: { roomId: string }) {
  const { data: scenes, isPending: scenesLoading } = $maps.useQuery(
    "get",
    "/scenes/",
  );
  const { data: searchResult, isPending: searchLoading } = $maps.useQuery(
    "get",
    "/scenes/areas/search",
    {
      params: { query: { query: roomId } },
    },
    {
      enabled: !!roomId,
    },
  );

  const roomArea = useMemo(() => {
    if (!searchResult || searchResult.length === 0) return null;

    // Find the area that matches the room ID
    const matchingArea = searchResult.find(
      (result) => result.area.room_booking_id === roomId,
    );

    return matchingArea ? matchingArea.area : null;
  }, [searchResult, roomId]);

  const sceneWithRoom = useMemo(() => {
    if (!scenes || !searchResult || searchResult.length === 0) return null;

    // Find the scene that contains the room
    const matchingResult = searchResult.find(
      (result) => result.area.room_booking_id === roomId,
    );

    if (!matchingResult) return null;

    return scenes.find((scene) => scene.scene_id === matchingResult.scene_id);
  }, [scenes, searchResult, roomId]);

  const isLoading = scenesLoading || searchLoading;

  if (isLoading) {
    return (
      <div className="border-border bg-muted/30 rounded-field flex min-h-64 w-full items-center justify-center border">
        <div className="text-center">
          <div className="border-inh-primary mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground mt-2 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!sceneWithRoom || !roomArea) {
    return (
      <div className="border-border bg-muted/30 rounded-field flex min-h-64 w-full items-center justify-center border">
        <div className="text-center">
          <span className="text-muted-foreground icon-[material-symbols--map-outline] text-2xl" />
          <p className="text-muted-foreground mt-2 text-sm">
            Room location not found on map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-background rounded-field relative min-h-64 w-full overflow-hidden border shadow-xs">
      <MapView
        scene={sceneWithRoom}
        highlightAreas={[roomArea]}
        disablePopup={true}
      />
      <Link
        to="/maps"
        search={{
          scene: sceneWithRoom.scene_id,
          area: roomArea.svg_polygon_id ?? undefined,
        }}
        className="bg-inh-primary/50 hover:bg-inh-primary/75 absolute right-2 bottom-2 flex h-fit rounded-xl px-2 py-2"
      >
        <span className="icon-[material-symbols--jump-to-element-rounded] text-2xl" />
      </Link>
    </div>
  );
}
