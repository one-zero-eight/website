import { RoomPage } from "@/components/room-booking/room-page/RoomPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/room-booking/rooms/$room")({
  component: RouteComponent,
});

function RouteComponent() {
  const { room } = Route.useParams();
  return <RoomPage id={room} />;
}
