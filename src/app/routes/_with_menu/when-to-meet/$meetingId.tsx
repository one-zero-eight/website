import { Topbar } from "@/components/layout/Topbar.tsx";
import { MeetingPage } from "@/components/when-to-meet/MeetingPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/when-to-meet/$meetingId")({
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

  return (
    <>
      <Helmet>
        <title>{name ?? "Meeting"} | When2Meet</title>
        <meta
          name="description"
          content="View meeting responses and choose the best time."
        />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <MeetingPage meetingId={meetingId} initialName={name} />
    </>
  );
}
