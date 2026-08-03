import { useMyAccessToken } from "@/api/helpers/access-token.ts";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { InstructorPreferencesEditor } from "@/components/schedule-assistant/preferences/InstructorPreferencesEditor.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

export const Route = createFileRoute("/schedule-assistant/for-instructors/")({
  validateSearch: (search: Record<string, unknown>): { key?: string } => ({
    key: search.key ? String(search.key) : undefined,
  }),
  component: ForInstructorsRoute,
});

function RequireAccessToken({ children }: PropsWithChildren) {
  const [token] = useMyAccessToken();
  if (!token) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  return children;
}

function ForInstructorsRoute() {
  const { key } = Route.useSearch();
  const editor = key ? (
    <InstructorPreferencesEditor mode="token" token={key} />
  ) : (
    <InstructorPreferencesEditor mode="me" />
  );

  return (
    <>
      <Helmet>
        <title>Предпочтения по времени</title>
        <meta
          name="description"
          content="Заполнение предпочтений по слотам для преподавателей Innopolis University."
        />
      </Helmet>
      {key ? (
        editor
      ) : (
        <RequireAuth>
          <RequireAccessToken>{editor}</RequireAccessToken>
        </RequireAuth>
      )}
    </>
  );
}
