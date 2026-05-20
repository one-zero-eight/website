import { ScheduleAssistantPage } from "@/components/schedule-assistant/ScheduleAssistantPage.tsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import { createFileRoute, redirect } from "@tanstack/react-router";

const SETTINGS_SUB_TABS = new Set<SettingsSubTab>([
  "courses",
  "groups",
  "instructors",
  "rooms",
  "semester",
]);

export const Route = createFileRoute(
  "/schedule-assistant/settings/$settingsTab",
)({
  beforeLoad: ({ params }) => {
    if (!SETTINGS_SUB_TABS.has(params.settingsTab as SettingsSubTab)) {
      throw redirect({
        to: "/schedule-assistant/settings/$settingsTab",
        params: { settingsTab: "courses" },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { settingsTab } = Route.useParams();
  return (
    <ScheduleAssistantPage
      tab="settings"
      settingsSubTab={settingsTab as SettingsSubTab}
    />
  );
}
