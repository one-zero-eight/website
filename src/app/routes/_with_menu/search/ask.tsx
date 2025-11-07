import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { AskPage } from "@/components/search/ask/AskPage";
import { TopbarWithToggleGroup } from "@/components/search/TopbarWithToggleGroup";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";

type AskParams = {
  q?: string;
};

export const Route = createFileRoute("/_with_menu/search/ask")({
  component: RouteComponent,
  validateSearch: (ask: Record<string, unknown>): AskParams => {
    return {
      q: (ask.q as string | undefined) ?? "",
    };
  },
});

function RouteComponent() {
  const { q } = Route.useSearch();
  return (
    <Suspense>
      <Helmet>
        <title>Ask</title>
        <meta
          name="description"
          content="Ask questions or find answers at Innopolis University."
        />
      </Helmet>

      <TopbarWithToggleGroup currentTabText={q} />
      <RequireAuth>
        <AskPage askQuery={q ?? ""} />
      </RequireAuth>
    </Suspense>
  );
}
