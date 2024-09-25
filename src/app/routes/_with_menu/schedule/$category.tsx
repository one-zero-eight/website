import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import ScheduleList from "@/components/schedule/ScheduleList.tsx";
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
      <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
        <Helmet>
          <title>{categoryInfo.title} — Schedule</title>
          <meta name="description" content={categoryInfo.shortDescription} />
        </Helmet>

        <NavbarTemplate
          title={`Schedule — ${categoryInfo.title}`}
          description={categoryInfo.shortDescription}
        />
        <ScheduleList category={category} />
      </div>
    );
  },

  beforeLoad: ({ params: { category } }) => {
    const categoryInfo = getCategoryInfoBySlug(category);
    if (!categoryInfo) {
      throw redirect({ to: "/schedule" });
    }
  },
});
