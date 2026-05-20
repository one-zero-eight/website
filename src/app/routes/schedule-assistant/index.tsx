import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/")({
  component: () => null,

  // Redirect immediately
  beforeLoad: () => {
    throw redirect({
      to: "/schedule-assistant/settings/$settingsTab",
      params: { settingsTab: "courses" },
    });
  },
});
