import { ActPage } from "@/components/search/act/ActPage";
import { TopbarWithToggleGroup } from "@/components/search/TopbarWithToggleGroup";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";

type ActParams = {
  q?: string;
};

export const Route = createFileRoute("/_with_menu/search/act")({
  component: RouteComponent,
  validateSearch: (act: Record<string, unknown>): ActParams => {
    return {
      q: (act.q as string | undefined) ?? "",
    };
  },
});

function RouteComponent() {
  const { q } = Route.useSearch();
  return (
    <Suspense>
      <Helmet>
        <title>Act</title>
        <meta
          name="description"
          content="Take actions based on search results or suggestions."
        />
      </Helmet>

      <TopbarWithToggleGroup currentTabText={q ?? ""} />
      <ActPage actQuery={q ?? ""} />
    </Suspense>
  );
}
