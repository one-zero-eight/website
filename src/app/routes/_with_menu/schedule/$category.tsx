import { Topbar } from "@/components/layout/Topbar.tsx";
import SchedulePage from "@/components/schedule/SchedulePage.tsx";
import { getCategoryInfoBySlug } from "@/lib/events/events-view-config.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/schedule/$category")({
  component: function RouteComponent() {
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
  },

  beforeLoad: ({ params: { category } }) => {
    const categoryInfo = getCategoryInfoBySlug(category);
    if (!categoryInfo) {
      throw redirect({ to: "/schedule" });
    }
  },
});
