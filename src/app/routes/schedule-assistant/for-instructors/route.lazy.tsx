import { Outlet, createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/schedule-assistant/for-instructors")(
  {
    component: ForInstructorsLayout,
  },
);

function ForInstructorsLayout() {
  return <Outlet />;
}
