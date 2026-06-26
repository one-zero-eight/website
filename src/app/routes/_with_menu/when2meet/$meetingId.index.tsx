import { Topbar } from "@/components/layout/Topbar.tsx";
import { MeetingPage } from "@/components/when2meet/MeetingPage";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/when2meet/$meetingId/")({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): { name?: string; setupSlots?: boolean } => {
    return {
      name: search.name ? search.name.toString() : undefined,
      setupSlots:
        search.setupSlots === true || search.setupSlots === "true"
          ? true
          : undefined,
    };
  },
});

function RouteComponent() {
  const { meetingId } = Route.useParams();
  const { name, setupSlots } = Route.useSearch();

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
      <MeetingPage
        meetingId={meetingId}
        initialName={name}
        setupSlots={setupSlots}
      />
    </>
  );
}
