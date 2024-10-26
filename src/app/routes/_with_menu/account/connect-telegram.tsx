import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/account/connect-telegram")({
  component: () => (
    <div className="flex w-full flex-row justify-center">
      <Helmet>
        <title>Connect Telegram</title>
        <meta
          name="description"
          content="Connect Telegram user to InNoHassle Account."
        />

        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://innohassle.ru/account" />
      </Helmet>

      <div className="m-4 flex w-full max-w-md flex-col gap-4 rounded-2xl bg-primary-main px-4 py-6 @container/account">
        <img
          src="/icon.svg"
          alt="InNoHassle logo"
          className="h-24 w-24 self-center"
        />
        <ConnectTelegramPage />
      </div>
    </div>
  ),
});
