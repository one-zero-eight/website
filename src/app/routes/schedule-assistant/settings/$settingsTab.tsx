import { SettingsWorkspace } from "@/components/schedule-assistant/settings/SettingsWorkspace.tsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import { isChecksReturnFrom } from "@/components/schedule-assistant/checks/ReturnToChecksLink.tsx";
import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

const SETTINGS_SUB_TABS = new Set<SettingsSubTab>([
  "courses",
  "groups",
  "instructors",
  "rooms",
  "semester",
]);

type SearchParams = {
  instructor?: string | undefined;
  from?: string | undefined;
};

export const Route = createFileRoute(
  "/schedule-assistant/settings/$settingsTab",
)({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    instructor:
      typeof search.instructor === "string" && search.instructor.trim()
        ? search.instructor.trim()
        : undefined,
    from: isChecksReturnFrom(
      typeof search.from === "string" ? search.from : undefined,
    )
      ? CHECKS_RETURN_FROM
      : undefined,
  }),
  // Validate params and redirect if unsupported
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
  const { instructor, from } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
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
