import { Topbar } from "@/components/layout/Topbar.tsx";
import { BookingPageTabs } from "@/components/room-booking/BookingPageTabs.tsx";
import { RoomBookingRules } from "@/components/room-booking/rules/RoomBookingRules.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/room-booking/rules")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Room booking rules`}</title>
        <meta
          name="description"
          content={t`Rules of room booking in Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Room booking</Trans>} hideOnMobile />
      <BookingPageTabs />
      <RoomBookingRules />
    </>
  );
}
