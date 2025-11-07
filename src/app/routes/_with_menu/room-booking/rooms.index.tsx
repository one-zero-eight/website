import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomsList } from "@/components/room-booking/rooms-list/RoomsList.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/room-booking/rooms/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Room booking</title>
        <meta
          name="description"
          content="Book auditoriums and meeting rooms in Innopolis University."
        />
      </Helmet>

      <Topbar title="Room booking" hideOnMobile />
      <BookingPageTabs />
      <RequireAuth>
        <RoomsList />
      </RequireAuth>
    </>
  );
}
