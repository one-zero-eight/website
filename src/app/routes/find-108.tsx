import { Find108Page } from "@/components/find-108/Find108Page.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/find-108")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="@container/content flex h-screen w-full flex-col overflow-hidden bg-black">
      <Helmet>
        <title>find-108</title>
        <meta
          name="description"
          content="Станция клуба one-zero-eight — сообщество людей, влюблённых в технологии"
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Find108Page />
    </div>
  );
}
