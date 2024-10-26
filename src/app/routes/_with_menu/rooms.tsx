import { DormRoomsPage } from "@/components/dorm-rooms/DormRoomsPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/rooms")({
  component: () => (
    <div className="flex min-h-full flex-col overflow-y-auto @container/content">
      <Helmet>
        <title>Dorm rooms</title>
        <meta
          name="description"
          content="Split duties in your dormitory room."
        />
      </Helmet>

      <Topbar title="Dorm rooms" />
      <DormRoomsPage />
    </div>
  ),
});
