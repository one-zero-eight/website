import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { CreateSheetPage } from "@/components/guard/CreateSheetPage.tsx";
import { GuardTabs } from "@/components/guard/GuardTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/guard/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Create sheet — Guard</title>
        <meta
          name="description"
          content="Create a new protected Google Spreadsheet with SSO join access."
        />
      </Helmet>

      <Topbar title="Guard" />
      <GuardTabs />
      <RequireAuth>
        <CreateSheetPage />
      </RequireAuth>
    </>
  );
}
