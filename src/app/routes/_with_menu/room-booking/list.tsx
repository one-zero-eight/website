import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { BookingsListPage } from "@/components/room-booking/bookings-list/BookingsListPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/room-booking/list")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`My bookings`}</title>
        <meta
          name="description"
          content={t`Manage your room bookings in Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Room booking</Trans>} hideOnMobile />
      <BookingPageTabs />
      <RequireAuth>
        <BookingsListPage />
      </RequireAuth>
    </>
  );
}
