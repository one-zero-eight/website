import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { RoomBookingPage } from "@/components/when2meet/RoomBookingPage";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/when2meet/$meetingId/book")({
  component: RouteComponent,
});

function RouteComponent() {
  const { meetingId } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Book a room | When2Meet</title>
        <meta name="description" content="Book a room for your meeting." />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <RequireAuth>
        <RoomBookingPage meetingId={meetingId} />
      </RequireAuth>
    </>
  );
}
