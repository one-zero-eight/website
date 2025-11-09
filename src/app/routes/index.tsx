import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => null,

  // Redirect immediately
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
