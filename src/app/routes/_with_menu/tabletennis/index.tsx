import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisPage } from "@/components/tabletennis/TabletennisPage";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { $tabletennis } from "@/api/tabletennis";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  isApiHttpError,
  formatApiErrorMessage,
} from "@/api/helpers/create-query-client";
import { Registration } from "@/components/tabletennis/Registration";
import { SignInButton } from "@/components/common/SignInButton";

export const Route = createFileRoute("/_with_menu/tabletennis/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { isPending, isError, error, refetch } = $tabletennis.useQuery(
    "get",
    "/get-player",
  );

  if (isPending) return <div className="skeleton h-48 w-full" />;

  if (isError && isApiHttpError(error) && error.httpCode === 401) {
    return (
      <div className="px-4 py-12">
        <h2 className="mb-4 text-3xl font-medium">
          <Trans>Sign in to get access</Trans>
        </h2>
        <p className="text-base-content/75 mb-4 text-lg">
          <Trans>
            Use your Innopolis account to access InNoHassle services.
          </Trans>
        </p>
        <SignInButton />
      </div>
    );
  }

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
        <title>{t`Table tennis`}</title>
        <meta name="description" content={t`Table tennis site`} />
      </Helmet>

      <Topbar title={<Trans>Table tennis club</Trans>} />
      <TabletennisTabs />
      <TabletennisPage />
    </>
  );
}
