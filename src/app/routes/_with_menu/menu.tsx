import { MorePage } from "@/components/layout/MorePage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/menu")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Menu</title>
        <meta name="description" content="Services list for navigation." />
      </Helmet>

      <MorePage />
    </>
  );
}
