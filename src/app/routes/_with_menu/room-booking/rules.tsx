import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomBookingRules } from "@/components/room-booking/rules/RoomBookingRules.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/room-booking/rules")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Room booking rules</title>
        <meta
          name="description"
          content="Rules of room booking in Innopolis University."
        />
      </Helmet>

      <Topbar title="Room booking" hideOnMobile />
      <BookingPageTabs />
      <RoomBookingRules />
    </>
  );
}
