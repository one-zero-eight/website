import { MyTokenPage } from "@/components/account/MyTokenPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/account/token")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Generate access token</title>
        <meta
          name="description"
          content="Generate access token for InNoHassle Account."
        />

        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://innohassle.ru/account/token" />
      </Helmet>

      <Topbar title="My account" />
      <div className="flex w-full flex-row justify-center">
        <div className="bg-inh-primary rounded-box @container/account m-4 flex w-full max-w-md flex-col gap-4 px-4 py-6">
          <MyTokenPage />
        </div>
      </div>
    </>
  );
}
