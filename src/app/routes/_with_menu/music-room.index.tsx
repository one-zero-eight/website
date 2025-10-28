import { Topbar } from "@/components/layout/Topbar.tsx";
import { MusicRoomPage } from "@/components/music-room/MusicRoomPage.tsx";
import { MusicRoomPageTabs } from "@/components/music-room/MusicRoomPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/music-room/")({
  component: () => (
    <>
      <Helmet>
        <title>Music room</title>
        <meta name="description" content="Book the Music room in Innopolis." />
      </Helmet>

      <Topbar title="Music room" />
      <MusicRoomPageTabs />
      <MusicRoomPage />
    </>
  ),
});
