import { ChecksWorkspace } from "@/components/schedule-assistant/checks/ChecksWorkspace.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/checks")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-28">
      <ChecksWorkspace />
    </div>
  );
}
