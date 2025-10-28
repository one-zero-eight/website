import { MyTokenPage } from "@/components/account/MyTokenPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

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
        <div className="m-4 flex w-full max-w-md flex-col gap-4 rounded-2xl bg-primary px-4 py-6 @container/account">
          <MyTokenPage />
        </div>
      </div>
    </>
  );
}
