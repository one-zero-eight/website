import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/")({
  beforeLoad: () => {
    throw redirect({
      to: "/schedule-assistant/settings/$settingsTab",
      params: { settingsTab: "courses" },
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Составление расписания</title>
        <meta
          name="description"
          content="Составление расписания в Innopolis University."
        />
        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
      </Helmet>
    </>
  );
}
