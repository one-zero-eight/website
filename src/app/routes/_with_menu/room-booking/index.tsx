import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomBookingPage } from "@/components/room-booking/timeline/RoomBookingPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

type RoomBookingSearch = {
  d?: number;
};

export const Route = createFileRoute("/_with_menu/room-booking/")({
  component: RouteComponent,
  validateSearch: (search): RoomBookingSearch => {
    const unix =
      typeof search.d === "number"
        ? search.d
        : typeof search.d === "string"
          ? Number.parseInt(search.d)
          : NaN;
    if (!Number.isNaN(unix) && unix > Date.UTC(0)) {
      return { d: unix };
    }
    return {};
  },
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
      <RoomBookingPage />
    </>
  );
}
