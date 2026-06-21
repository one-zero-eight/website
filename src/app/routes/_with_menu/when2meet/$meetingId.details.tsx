import { Topbar } from "@/components/layout/Topbar.tsx";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { EventDetailsPage } from "@/components/when2meet/EventDetailsPage.tsx";
import { parseBackendSlots } from "@/components/when2meet/utils/api-slots.ts";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_with_menu/when2meet/$meetingId/details",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { name?: string } => {
    return {
      name: search.name ? search.name.toString() : undefined,
    };
  },
});

function RouteComponent() {
  const { meetingId } = Route.useParams();
  const { name } = Route.useSearch();

  const {
    data: event,
    isPending,
    isError,
    error,
  } = $when2meet.useQuery("get", "/events/{event_id}", {
    params: { path: { event_id: meetingId } },
  });

  if (isPending) {
    return (
      <>
        <Topbar title="When2Meet" hideOnMobile={true} />
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="skeleton h-8 w-48" />
        </div>
      </>
    );
  }

  if (isError || !event) {
    return (
      <>
        <Topbar title="When2Meet" hideOnMobile={true} />
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{name ?? event.name} | When2Meet</title>
      </Helmet>
      <Topbar title="When2Meet" hideOnMobile={true} />
      <EventDetailsPage
        meetingId={meetingId}
        meetingName={event.name ?? name ?? "Meeting"}
        meetingDates={event.slots ? parseBackendSlots(event.slots).dates : []}
        description={event.description}
      />
    </>
  );
}
