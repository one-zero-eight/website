import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomsList } from "@/components/room-booking/rooms-list/RoomsList.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/room-booking/rooms/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Rooms list`}</title>
        <meta
          name="description"
          content={t`All rooms available for booking in Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Room booking</Trans>} hideOnMobile />
      <BookingPageTabs />
      <RequireAuth>
        <RoomsList />
      </RequireAuth>
    </>
  );
}
