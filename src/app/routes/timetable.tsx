import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/timetable")({
  validateSearch: (search: Record<string, unknown>): { meeting?: string } => ({
    meeting:
      typeof search.meeting === "string" && search.meeting.trim()
        ? search.meeting.trim()
        : undefined,
  }),
});
