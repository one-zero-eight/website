import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { MeetingsLandingPage } from "@/components/when-to-meet/MeetingsLandingPage.tsx";

export const Route = createFileRoute("/_with_menu/when-to-meet/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>When2Meet</title>
        <meta
          name="description"
          content="Create meetings and find free time easily."
        />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <MeetingsLandingPage />
    </>
  );
}
