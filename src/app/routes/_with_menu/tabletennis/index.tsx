import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisPage } from "@/components/tabletennis/TabletennisPage";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { $tabletennis } from "@/api/tabletennis";
import {
  isApiHttpError,
  formatApiErrorMessage,
} from "@/api/helpers/create-query-client";
import { Registration } from "@/components/tabletennis/Registration";

export const Route = createFileRoute("/_with_menu/tabletennis/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isPending, isError, error, refetch } = $tabletennis.useQuery(
    "get",
    "/get_player",
  );

  if (isPending) return <div className="skeleton h-48 w-full" />;

  if (isError && isApiHttpError(error) && error.httpCode === 404) {
    return <Registration onRegistered={() => refetch()} />;
  }

  if (isError) {
    return (
      <p className="text-error py-8 text-center">
        {formatApiErrorMessage(error)}
      </p>
    );
  }

  return (
    <>
      <Helmet>
        <title>Table tennis</title>
        <meta name="description" content="Table tennis site" />
      </Helmet>

      <Topbar title="Table tennis club" />
      <TabletennisTabs />
      <TabletennisPage />
    </>
  );
}
