import { Topbar } from "@/components/layout/Topbar.tsx";
import { MapsPage } from "@/components/maps/MapsPage.tsx";
import { MapsPageTabs } from "@/components/maps/MapsPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/maps")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { scene?: string; q?: string; area?: string } => {
    return {
      scene: search.scene
        ? search.scene.toString()
        : search.sceneId // Backward compatibility with 'sceneId' query parameter
          ? search.sceneId.toString()
          : undefined,
      area: search.area ? search.area.toString() : undefined,
      q: search.q ? search.q.toString() : undefined,
    };
  },

  component: RouteComponent,
});

function RouteComponent() {
  const { scene, area, q } = Route.useSearch();
  return (
    <>
      <Helmet>
        <title>Maps</title>
        <meta
          name="description"
          content="View plans of Innopolis University."
        />
      </Helmet>

      <Topbar title={<Trans>Maps</Trans>} hideOnMobile />
      <MapsPageTabs />
      <MapsPage sceneId={scene} areaId={area} q={q} />
    </>
  );
}
