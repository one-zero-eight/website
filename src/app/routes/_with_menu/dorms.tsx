import { DormsPage } from "@/components/dorms/DormsPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/dorms")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Dorms`}</title>
        <meta
          name="description"
          content={t`Split duties in your dormitory room.`}
        />
      </Helmet>

      <Topbar title={<Trans>Dorms</Trans>} />
      <DormsPage />
    </>
  );
}
