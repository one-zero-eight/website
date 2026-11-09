import { Trans, useLingui } from "@lingui/react/macro";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { SearchPage } from "@/components/search/SearchPage.tsx";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";

type SearchParams = {
  // User's search query
  q?: string;
};

export const Route = createFileRoute("/_with_menu/search/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string | undefined) ?? "",
    };
  },
});

function RouteComponent() {
  const { t } = useLingui();
  const { q } = Route.useSearch();
  return (
    <Suspense>
      <Helmet>
        <title>{t`Search`}</title>
        <meta
          name="description"
          content={t`Search anything at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Search</Trans>} />
      <RequireAuth>
        <SearchPage searchQuery={q ?? ""} />
      </RequireAuth>
    </Suspense>
  );
}
