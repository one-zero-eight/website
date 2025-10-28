import { Topbar } from "@/components/layout/Topbar.tsx";
import { MusicRoomInstructions } from "@/components/music-room/MusicRoomInstructions.tsx";
import { MusicRoomPageTabs } from "@/components/music-room/MusicRoomPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/music-room/instructions")({
  component: () => (
    <>
      <Helmet>
        <title>Music room</title>
        <meta name="description" content="Book the Music room in Innopolis." />
      </Helmet>

      <Topbar title="Music room" />
      <MusicRoomPageTabs />
      <MusicRoomInstructions />
    </>
  ),
});
