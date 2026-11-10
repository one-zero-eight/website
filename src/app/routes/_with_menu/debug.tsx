import { DebugPage } from "@/components/debug/DebugPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/debug")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Debug</title>
        <meta
          name="description"
          content="Inspect app builds, service workers, and offline caches."
        />
      </Helmet>
      <Topbar
        title={
          <span className="inline-block pr-32">
            <span id="debug-title" className="[anchor-name:--debug-title]">
              Debug
            </span>
          </span>
        }
      />
      <DebugPage />
    </>
  );
}
