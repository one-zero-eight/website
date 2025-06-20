import { Topbar } from "@/components/layout/Topbar.tsx";
import { AskPage } from "@/components/search/AskPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Helmet } from "react-helmet-async";

type SearchParams = {
  q: string;
};

export const Route = createFileRoute("/_with_menu/ask")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: (search.q as string) ?? "",
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

        <Topbar title="Ask" />
        <AskPage searchQuery={q} />
      </Suspense>
    );
  },
});
