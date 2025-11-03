import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/workshops")({
  component: () => null,

  // Redirect to Dashboard
  beforeLoad: () => {
    throw redirect({ to: "/events" });
  },
});
