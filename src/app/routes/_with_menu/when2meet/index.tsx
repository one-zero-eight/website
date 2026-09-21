import { Topbar } from "@/components/layout/Topbar.tsx";
import {
  createFileRoute,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { MeetingsLandingPage } from "@/components/when2meet/MeetingsLandingPage";
import { MeetingStatus } from "@/api/when2meet/types.ts";
import { MeetingsTabs } from "@/components/when2meet/MeetingsTabs.tsx";

export const Route = createFileRoute("/_with_menu/when2meet/")({
  component: RouteComponent,
  validateSearch: (
    search: SearchSchemaInput & { status?: unknown },
  ): { status: MeetingStatus } => ({
    status:
      search.status === MeetingStatus.archived
        ? MeetingStatus.archived
        : MeetingStatus.active,
  }),
});

function RouteComponent() {
  const { status } = Route.useSearch();

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
      <MeetingsTabs />
      <MeetingsLandingPage status={status} />
    </>
  );
}
