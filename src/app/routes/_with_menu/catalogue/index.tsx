import { CataloguePage } from "@/components/course-materials/Catalogue";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/catalogue/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Catalogue</title>
        <meta
          name="description"
          content="All course materials of previous years"
        />
      </Helmet>

      <Topbar title="Catalogue" />
      <CataloguePage />
    </>
  );
}
