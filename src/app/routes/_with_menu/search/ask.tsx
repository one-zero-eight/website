import { AskPage } from "@/components/search/ask/AskPage";
import { TopbarWithToggleGroup } from "@/components/search/TopbarWithToggleGroup";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "react-helmet-async";

type AskParams = {
  q?: string;
};

export const Route = createFileRoute("/_with_menu/search/ask")({
  validateSearch: (ask: Record<string, unknown>): AskParams => {
    return {
      q: (ask.q as string | undefined) ?? "",
    };
  },

  component: function AskPageComponent() {
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
        <AskPage askQuery={q ?? ""} />
      </Suspense>
    );
  },
});
