import { Topbar } from "@/components/layout/Topbar.tsx";
import { MusicRoomInstructions } from "@/components/music-room/MusicRoomInstructions.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/music-room/instructions")({
  component: () => (
    <div className="flex min-h-full flex-col overflow-y-auto @container/content">
      <Helmet>
        <title>Music room</title>
        <meta name="description" content="Book the Music room in Innopolis." />
      </Helmet>

      <Topbar title="Music room" />
      <MusicRoomInstructions />
    </div>
  ),
});
