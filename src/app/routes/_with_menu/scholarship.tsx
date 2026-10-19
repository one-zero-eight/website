import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScholarshipPage } from "@/components/scholarship/ScholarshipPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/scholarship")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Scholarship calculator</title>
        <meta
          name="description"
          content={
            "Calculate your scholarship at Innopolis University. " +
            "Type your marks for the previous semester to see the expected scholarship."
          }
        />
      </Helmet>

      <Topbar title={<Trans>Scholarship</Trans>} />
      <ScholarshipPage />
    </>
  );
}
