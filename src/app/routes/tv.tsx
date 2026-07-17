import { useRoomTvAuth } from "@/api/helpers/room-tv-auth.ts";
import { RoomTvPage } from "@/components/room-booking/tv/RoomTvPage.tsx";
import { TvStartupPage } from "@/components/room-booking/tv/TvStartupPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tv")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated, roomId, code, error } = useRoomTvAuth();

  if (isAuthenticated && roomId) {
    return <RoomTvPage id={roomId} />;
  }

  return <TvStartupPage code={code} error={error} />;
}
