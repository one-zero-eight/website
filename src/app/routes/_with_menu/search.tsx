import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
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
        <div className="flex min-h-[100dvh] flex-col p-4 @container/content @2xl/main:p-12">
          <Helmet>
            <title>Search</title>
            <meta
              name="description"
              content="Search for anything at Innopolis University."
            />
          </Helmet>

          <NavbarTemplate
            title="Search"
            description="Find anything at Innopolis University"
          />
          <SearchPage searchQuery={q} />
        </div>
      </Suspense>
    );
  },
});
