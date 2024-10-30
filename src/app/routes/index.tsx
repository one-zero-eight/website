import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => null,

  // Redirect to Dashboard
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
