import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { RoomBookingPage } from "@/components/room-booking/RoomBookingPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/room-booking")({
  component: () => (
    <div className="flex h-full flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Room booking</title>
        <meta
          name="description"
          content="Book auditoriums and meeting rooms in Innopolis University."
        />
      </Helmet>

      <NavbarTemplate
        title="Room booking"
        description="Book auditoriums and meeting rooms in Innopolis University."
      />
      <div className="mt-4 flex-grow">
        <RoomBookingPage />
      </div>
    </div>
  ),
});
