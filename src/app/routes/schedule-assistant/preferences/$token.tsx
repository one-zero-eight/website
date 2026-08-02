import { InstructorPreferencesEditor } from "@/components/schedule-assistant/preferences/InstructorPreferencesEditor.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/preferences/$token")({
  component: PreferenceTokenRoute,
});

function PreferenceTokenRoute() {
  const { token } = Route.useParams();
  return (
    <>
      <Helmet>
        <title>Предпочтения преподавателя</title>
      </Helmet>
      <InstructorPreferencesEditor mode="token" token={token} />
    </>
  );
}
