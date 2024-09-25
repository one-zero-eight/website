import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/account/")({
  component: () => <Navigate to="/" />,
});
