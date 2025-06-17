import { Topbar } from "@/components/layout/Topbar.tsx";
import { ActPage } from "@/components/search/ActPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "react-helmet-async";

type SearchParams = {
  q: string;
};

export const Route = createFileRoute("/_with_menu/act")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) ?? "",
    };
  },

  component: function ActPageComponent() {
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

        <Topbar title="Act" />
        <ActPage searchQuery={q} />
      </Suspense>
    );
  },
});
