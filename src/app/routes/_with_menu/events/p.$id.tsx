import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventPage } from "@/components/events/event/EventPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/events/p/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Events`}</title>
        <meta name="description" content={t`University event details.`} />
      </Helmet>

      <Topbar title={<Trans>Events</Trans>} hideOnMobile={true} />
      <EventsTabs />
      <EventPage id={id} />
    </>
  );
}
