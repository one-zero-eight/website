import { GuardPage } from "@/components/guard/GuardPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/guard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Guard</title>
      </Helmet>

      <Topbar title="Guard" />
      <GuardPage />
    </>
  );
}
