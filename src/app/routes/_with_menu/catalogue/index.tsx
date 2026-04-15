import { CataloguePage } from "@/components/course-materials/Catalogue";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

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
        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Catalogue" />
      <CataloguePage />
    </>
  );
}
