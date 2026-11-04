import { useLingui } from "@lingui/react/macro";
import { MorePage } from "@/components/layout/MorePage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/menu")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Menu`}</title>
        <meta name="description" content={t`Services list for navigation.`} />
      </Helmet>

      <MorePage />
    </>
  );
}
