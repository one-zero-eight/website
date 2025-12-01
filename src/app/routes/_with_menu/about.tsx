import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/about/AboutPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Topbar } from "@/components/layout/Topbar.tsx";
export const Route = createFileRoute("/_with_menu/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>whoami: one-zero-eight</title>
        <meta
          name="description"
          content="about InNoHassle and one-zero-eight team"
        />
      </Helmet>

      <Topbar title="" />
      <AboutPage />
    </>
  );
}
