import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomBookingPage } from "@/components/room-booking/timeline/RoomBookingPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

type RoomBookingSearch = {
  d?: number;
};

export const Route = createFileRoute("/_with_menu/room-booking/")({
  component: RouteComponent,
  validateSearch: (search): RoomBookingSearch => {
    const result: RoomBookingSearch = {};
    const unix =
      typeof search.d === "number"
        ? search.d
        : typeof search.d === "string"
          ? Number.parseInt(search.d)
          : NaN;
    if (!Number.isNaN(unix) && unix > Date.UTC(0)) {
      result.d = unix;
    }
    return result;
  },
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Room booking`}</title>
        <meta
          name="description"
          content={t`Book auditoriums and meeting rooms in Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Room booking</Trans>} hideOnMobile />
      <BookingPageTabs />
      <RequireAuth>
        <RoomBookingPage />
      </RequireAuth>
    </>
  );
}
