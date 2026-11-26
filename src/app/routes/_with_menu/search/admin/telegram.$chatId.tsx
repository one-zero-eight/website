import { TelegramChatPage } from "@/components/search/admin/TelegramChatPage";
import { CatixAdminTabs } from "@/components/search/admin/CatixAdminTabs";
import { RequireCatixAdmin } from "@/components/search/admin/RequireCatixAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute(
  "/_with_menu/search/admin/telegram/$chatId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { chatId } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`cAtIx admin: Telegram chat`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title={<Trans>cAtIx admin</Trans>} />
      <RequireCatixAdmin>
        <CatixAdminTabs />
        <TelegramChatPage chatId={Number(chatId)} />
      </RequireCatixAdmin>
    </>
  );
}
