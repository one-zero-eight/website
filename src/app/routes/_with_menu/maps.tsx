import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { MapsPage } from "@/components/maps/MapsPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/maps")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { sceneId: string | undefined } => {
    return {
      sceneId: (search.sceneId as string) ?? undefined,
    };
  },

  component: function RouteComponent() {
    const { sceneId } = Route.useSearch();
    return (
      <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
        <Helmet>
          <title>Maps</title>
          <meta
            name="description"
            content="View plans of Innopolis University."
          />
        </Helmet>

        <NavbarTemplate
          title="Maps"
          description="View plans of Innopolis University."
        />
        <div className="mt-4 flex-grow">
          <MapsPage sceneId={sceneId} />
        </div>
      </div>
    );
  },
});
