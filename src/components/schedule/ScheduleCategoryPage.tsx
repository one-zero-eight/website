import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import ScheduleList from "@/components/schedule/ScheduleList.tsx";
import { getCategoryInfoBySlug } from "@/lib/events/events-view-config.ts";
import { Helmet } from "react-helmet-async";

export function ScheduleCategoryPage({ category }: { category: string }) {
  const categoryInfo = getCategoryInfoBySlug(category);

  return (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>{categoryInfo?.title ?? ""} — Schedule</title>
        <meta name="description" content={categoryInfo?.shortDescription} />
      </Helmet>

      <NavbarTemplate
        title={`Schedule${
          categoryInfo?.title ? " — " + categoryInfo.title : ""
        }`}
        description={categoryInfo?.shortDescription}
      />
      <ScheduleList category={category} />
    </div>
  );
}
