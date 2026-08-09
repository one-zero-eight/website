import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SubmissionPage } from "@/components/events/submissions/SubmissionPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/submissions/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="Review an event submission." />
      </Helmet>

      <Topbar title="Events" hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <SubmissionPage id={id} />
      </RequireAuth>
    </>
  );
}
