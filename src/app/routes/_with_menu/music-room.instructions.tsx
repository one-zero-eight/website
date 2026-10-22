import { Topbar } from "@/components/layout/Topbar.tsx";
import { MusicRoomInstructions } from "@/components/music-room/MusicRoomInstructions.tsx";
import { MusicRoomPageTabs } from "@/components/music-room/MusicRoomPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/music-room/instructions")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Music room`}</title>
        <meta
          name="description"
          content={t`Book the Music room in Innopolis.`}
        />
      </Helmet>

      <Topbar title={<Trans>Music room</Trans>} />
      <MusicRoomPageTabs />
      <MusicRoomInstructions />
    </>
  );
}
