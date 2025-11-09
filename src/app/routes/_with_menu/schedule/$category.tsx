import { Topbar } from "@/components/layout/Topbar.tsx";
import SchedulePage from "@/components/schedule/SchedulePage.tsx";
import { getCategoryInfoBySlug } from "@/components/schedule/view-config.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

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
  const { category } = Route.useParams();
  const categoryInfo = getCategoryInfoBySlug(category);

  if (!categoryInfo) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{categoryInfo.title} — Schedule</title>
        <meta name="description" content={categoryInfo.shortDescription} />
      </Helmet>

      <Topbar title="Schedule" />
      <SchedulePage category={category} />
    </>
  );
}
