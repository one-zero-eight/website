import { Topbar } from "@/components/layout/Topbar.tsx";
import { CreateMeetingPage } from "@/components/when2meet/CreateMeetingPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/when2meet/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>New meeting | When2Meet</title>
        <meta
          name="description"
          content="Create a meeting and share a link for participants to mark their availability."
        />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <CreateMeetingPage />
    </>
  );
}
