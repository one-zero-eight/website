import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/account/connect-telegram")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t({ message: "Connect Telegram", context: "title" })}</title>
        <meta
          name="description"
          content={t`Connect Telegram user to InNoHassle Account.`}
        />

        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://innohassle.ru/account" />
      </Helmet>

      <Topbar title={<Trans>My account</Trans>} />
      <div className="flex w-full flex-row justify-center">
        <div className="bg-base-200 rounded-box @container/account m-4 flex w-full max-w-md flex-col gap-4 px-4 py-6">
          <img
            src="/favicon.svg"
            alt="InNoHassle"
            className="h-24 w-24 self-center"
          />
          <ConnectTelegramPage />
        </div>
      </div>
    </>
  );
}
