import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/")({
  beforeLoad: () => {
    throw redirect({
      to: "/sport/schedule",
    });
  },
}); 