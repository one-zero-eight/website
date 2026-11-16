import { useRoomTvAuth } from "@/api/helpers/room-tv-auth.ts";
import { RoomTvPage } from "@/components/room-booking/tv/RoomTvPage.tsx";
import { TvStartupPage } from "@/components/room-booking/tv/TvStartupPage.tsx";
import { T } from "@/lib/utils/dates";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useInterval } from "usehooks-ts";

export const Route = createLazyFileRoute("/tv")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated, roomId, code, error } = useRoomTvAuth();

  useInterval(() => {
    if (!document.fullscreenElement) {
      // Set fullscreen (may fail without initial user interaction)
      document.documentElement
        .requestFullscreen({ navigationUI: "hide" })
        .catch((e) => console.log(`Could not request fullscreen: ${e}`));
    }
  }, 10 * T.Sec);

  if (isAuthenticated && roomId) {
    return <RoomTvPage id={roomId} />;
  }

  return <TvStartupPage code={code} error={error} />;
}
