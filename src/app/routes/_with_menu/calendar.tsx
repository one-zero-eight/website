import { CalendarPage } from "@/components/calendar/CalendarPage.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Personal calendar`}</title>
        <meta name="description" content={t`View your personal calendar.`} />
      </Helmet>

      <Topbar title={<Trans>Calendar</Trans>} hideOnMobile hideBorder />
      <RequireAuth>
        <CalendarPage />
      </RequireAuth>
    </>
  );
}
