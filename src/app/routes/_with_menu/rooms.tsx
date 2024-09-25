import { DormRoomsPage } from "@/components/dorm-rooms/DormRoomsPage.tsx";
import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/rooms")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Dorm rooms</title>
        <meta
          name="description"
          content="Split duties in your dormitory room."
        />
      </Helmet>

      <NavbarTemplate
        title="Dorm rooms"
        description="Split duties in your dormitory room."
      />
      <DormRoomsPage />
    </div>
  ),
});
