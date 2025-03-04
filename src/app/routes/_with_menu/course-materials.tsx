import { CourseMaterialsPage } from "@/components/course-materials/CourseMaterialsPage";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/course-materials")({
  component: () => (
    <>
      <Helmet>
        <title>Course Materials</title>
        <meta
          name="description"
          content="All course materials of previous years"
        />
      </Helmet>
      <Topbar title="Course Materials" />
      <CourseMaterialsPage />
    </>
  ),
});
