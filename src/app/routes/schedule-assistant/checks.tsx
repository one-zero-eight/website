import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/checks")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="flex w-full flex-1" />;
}
