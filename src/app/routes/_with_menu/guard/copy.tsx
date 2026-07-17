import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { CopySheetPage } from "@/components/guard/CopySheetPage.tsx";
import { GuardTabs } from "@/components/guard/GuardTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/guard/copy")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Copy sheet — Guard</title>
        <meta
          name="description"
          content="Copy an existing Google Spreadsheet into a protected Guard sheet."
        />
      </Helmet>

      <Topbar title="Guard" />
      <GuardTabs />
      <RequireAuth>
        <CopySheetPage />
      </RequireAuth>
    </>
  );
}
