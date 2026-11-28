import { createFileRoute, redirect } from "@tanstack/react-router";

type SearchParams = {
  q?: string;
};

export const Route = createFileRoute("/_with_menu/search/")({
  component: () => null,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
  }),

  // The search page is gone: its links open the assistant with the query in the input
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/search/ask",
      search: search.q ? { q: search.q } : {},
      replace: true,
    });
  },
});
