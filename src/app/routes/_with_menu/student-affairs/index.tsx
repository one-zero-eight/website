import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/student-affairs/")({
  component: () => null,

  // Redirect immediately
  beforeLoad: () => {
    throw redirect({ to: "/student-affairs/sign-in" });
  },
});
