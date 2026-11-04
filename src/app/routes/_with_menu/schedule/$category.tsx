import { Topbar } from "@/components/layout/Topbar.tsx";
import SchedulePage from "@/components/schedule/SchedulePage.tsx";
import {
  getCategoryInfoBySlug,
  getCategoryShortDescription,
  getCategoryTitle,
} from "@/components/schedule/view-config.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/schedule/$category")({
  component: RouteComponent,
  beforeLoad: ({ params: { category } }) => {
    const categoryInfo = getCategoryInfoBySlug(category);
    if (!categoryInfo) {
      throw redirect({ to: "/schedule" });
    }
  },
});

function RouteComponent() {
  const { t, i18n } = useLingui();
  const { category } = Route.useParams();
  const categoryInfo = getCategoryInfoBySlug(category);

  if (!categoryInfo) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>
          {getCategoryTitle(categoryInfo, i18n.locale)} — {t`Schedule`}
        </title>
        <meta
          name="description"
          content={getCategoryShortDescription(categoryInfo, i18n.locale)}
        />
      </Helmet>

      <Topbar title={<Trans>Schedule</Trans>} />
      <SchedulePage category={category} />
    </>
  );
}
