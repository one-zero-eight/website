import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/settings/")({
  beforeLoad: () => {
    throw redirect({
      to: "/schedule-assistant/settings/$settingsTab",
      params: { settingsTab: "courses" },
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
