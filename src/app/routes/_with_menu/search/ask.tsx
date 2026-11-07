import { useLingui } from "@lingui/react/macro";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { AskPage } from "@/components/search/ask/AskPage";
import { NewChatButton } from "@/components/search/ask/NewChatButton";
import { CatixTitle } from "@/components/search/ask/CatixTitle";
import { Topbar } from "@/components/layout/Topbar";
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
  const { t } = useLingui();
  const { q } = Route.useSearch();
  return (
    <Suspense>
      <Helmet>
        <title>{t`Ask`}</title>
        <meta
          name="description"
          content={t`Ask questions or find answers at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<CatixTitle />} titleAction={<NewChatButton />} />
      <RequireAuth>
        <AskPage askQuery={q ?? ""} />
      </RequireAuth>
    </Suspense>
  );
}
