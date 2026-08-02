import { InstructorPreferencesEditor } from "@/components/schedule-assistant/preferences/InstructorPreferencesEditor.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/preferences/")({
  component: PreferencesRoute,
});

function PreferencesRoute() {
  return (
    <>
      <Helmet>
        <title>Предпочтения преподавателя</title>
      </Helmet>
      <InstructorPreferencesEditor mode="me" />
    </>
  );
}
