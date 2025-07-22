import { CoursePage } from "@/components/course-materials/CoursePage";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/catalogue/$course")({
  component: CatalogueLayout,
});

function CatalogueLayout() {
  const { course } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{decodeURIComponent(course)} | Catalogue</title>

        <meta
          name="description"
          content="All course materials of previous years"
        />
      </Helmet>
      <Topbar title="Catalogue" />
      <CoursePage course={course} />
    </>
  );
}
