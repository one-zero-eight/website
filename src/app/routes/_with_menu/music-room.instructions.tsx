import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { MusicRoomInstructions } from "@/components/music-room/MusicRoomInstructions.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/music-room/instructions")({
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
      <MusicRoomInstructions />
    </div>
  ),
});
