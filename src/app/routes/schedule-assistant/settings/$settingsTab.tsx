import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import {
  CHECKS_RETURN_FROM,
  isChecksReturnFrom,
} from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";

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
});
