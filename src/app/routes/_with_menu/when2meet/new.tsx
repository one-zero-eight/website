import { useLingui } from "@lingui/react/macro";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { CreationPage } from "@/components/when2meet/CreationPage";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_with_menu/when2meet/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`New meeting | When2Meet`}</title>
        <meta
          name="description"
          content={t`Create a new meeting and find free time easily.`}
        />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <CreationPage />
    </>
  );
}
