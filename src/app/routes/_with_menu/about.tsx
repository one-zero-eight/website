import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/about/AboutPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
export const Route = createFileRoute("/_with_menu/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>About one-zero-eight</title>
        <meta
          name="description"
          content="one-zero-eight team is the community of
           students of Innopolis University passionate about technology"
        />
      </Helmet>

      <AboutPage />
    </>
  );
}
