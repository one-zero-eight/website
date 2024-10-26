import { Topbar } from "@/components/layout/Topbar.tsx";
import { SearchPage } from "@/components/search/SearchPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "react-helmet-async";

type SearchParams = {
  // User's search query
  q: string;
};

export const Route = createFileRoute("/_with_menu/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) ?? "",
    };
  },

  component: function PageComponent() {
    const { q } = Route.useSearch();
    return (
      <Suspense>
        <div className="flex min-h-full flex-col overflow-y-auto @container/content">
          <Helmet>
            <title>Search</title>
            <meta
              name="description"
              content="Search anything at Innopolis University."
            />
          </Helmet>

          <Topbar title="Search" />
          <SearchPage searchQuery={q} />
        </div>
      </Suspense>
    );
  },
});
