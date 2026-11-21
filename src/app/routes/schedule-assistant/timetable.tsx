import {
  CHECKS_RETURN_FROM,
  isChecksReturnFrom,
} from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { createFileRoute } from "@tanstack/react-router";

type SearchParams = {
  meeting?: string | undefined;
  from?: string | undefined;
};

export const Route = createFileRoute("/schedule-assistant/timetable")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    meeting:
      typeof search.meeting === "string" && search.meeting.trim()
        ? search.meeting.trim()
        : undefined,
    from: isChecksReturnFrom(
      typeof search.from === "string" ? search.from : undefined,
    )
      ? CHECKS_RETURN_FROM
      : undefined,
  }),
});
