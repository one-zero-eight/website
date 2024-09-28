import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { MusicRoomPage } from "@/components/music-room/MusicRoomPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/music-room/")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Music room</title>
        <meta name="description" content="Book the Music room in Innopolis." />
      </Helmet>

      <NavbarTemplate
        title="Music room"
        description="Book the Music room in Sports center freely."
      />
      <MusicRoomPage />
    </div>
  ),
});
