import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/for-instructors/")({
  validateSearch: (search: Record<string, unknown>): { key?: string } => ({
    key: search.key ? String(search.key) : undefined,
  }),
});
