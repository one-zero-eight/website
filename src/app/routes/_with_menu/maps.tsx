import { Topbar } from "@/components/layout/Topbar.tsx";
import { MapsPage } from "@/components/maps/MapsPage.tsx";
import { MapsPageTabs } from "@/components/maps/MapsPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/maps")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { sceneId?: string; q?: string } => {
    return {
      sceneId: (search.sceneId as string) ?? undefined,
      q: (search.q as string) ?? undefined,
    };
  },

  component: function RouteComponent() {
    const { sceneId, q } = Route.useSearch();
    return (
      <>
        <Helmet>
          <title>Maps</title>
          <meta
            name="description"
            content="View plans of Innopolis University."
          />
        </Helmet>

        <Topbar title="Maps" />
        <MapsPageTabs />
        <MapsPage sceneId={sceneId} q={q} />
      </>
    );
  },
});
