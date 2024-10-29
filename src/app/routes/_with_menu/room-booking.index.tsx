import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomBookingPage } from "@/components/room-booking/timeline/RoomBookingPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/room-booking/")({
  component: () => (
    <>
      <Helmet>
        <title>Room booking</title>
        <meta
          name="description"
          content="Book auditoriums and meeting rooms in Innopolis University."
        />
      </Helmet>

      <Topbar title="Room booking" />
      <BookingPageTabs />
      <RoomBookingPage />
    </>
  ),
});
