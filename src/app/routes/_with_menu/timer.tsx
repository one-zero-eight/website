import { Topbar } from "@/components/layout/Topbar.tsx";
import TimerPage from "@/components/timer/TimerPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/timer")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Timer`}</title>
        <meta
          name="description"
          content={t`Make a time deadline for any task with this timer.`}
        />
      </Helmet>

      <Topbar title={<Trans>Countdown Timer</Trans>} />
      <TimerPage />
    </>
  );
}
