import { SettingsWorkspace } from "@/components/schedule-assistant/settings/SettingsWorkspace.tsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createLazyFileRoute(
  "/schedule-assistant/settings/$settingsTab",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { settingsTab } = Route.useParams();
  const { instructor, from } = Route.useSearch();
  const navigate = useNavigate({
    from: "/schedule-assistant/settings/$settingsTab",
  });
  const returnFromChecks = from === CHECKS_RETURN_FROM;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-28">
      <SettingsWorkspace
        settingsTab={settingsTab as SettingsSubTab}
        focusInstructorId={instructor}
        returnFromChecks={returnFromChecks}
        onFocusInstructorHandled={() =>
          navigate({
            search: returnFromChecks ? { from: CHECKS_RETURN_FROM } : {},
            replace: true,
          })
        }
      />
    </div>
  );
}
