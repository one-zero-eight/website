import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScholarshipPage } from "@/components/scholarship/ScholarshipPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/scholarship")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Scholarship calculator`}</title>
        <meta
          name="description"
          content={t`Calculate your scholarship at Innopolis University. Type your marks for the previous semester to see the expected scholarship.`}
        />
      </Helmet>

      <Topbar title={<Trans>Scholarship</Trans>} />
      <ScholarshipPage />
    </>
  );
}
