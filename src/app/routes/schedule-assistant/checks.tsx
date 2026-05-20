import { ScheduleAssistantPage } from "@/components/schedule-assistant/ScheduleAssistantPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/checks")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ScheduleAssistantPage tab="checks" settingsSubTab="courses" />;
}
