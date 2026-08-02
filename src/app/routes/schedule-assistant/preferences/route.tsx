import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/preferences")({
  component: PreferencesLayout,
});

function PreferencesLayout() {
  return <Outlet />;
}
