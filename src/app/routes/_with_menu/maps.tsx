import { Topbar } from "@/components/layout/Topbar.tsx";
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
      <div className="flex min-h-full flex-col overflow-y-auto @container/content">
        <Helmet>
          <title>Maps</title>
          <meta
            name="description"
            content="View plans of Innopolis University."
          />
        </Helmet>

        <Topbar title="Maps" />
        <MapsPage sceneId={sceneId} />
      </div>
    );
  },
});
