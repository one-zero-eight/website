import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rooms/$room")({
  component: () => null,

  // Redirect to Dashboard
  beforeLoad: ({ params: { room } }) => {
    throw redirect({ to: "/room-booking/rooms/$room", params: { room } });
  },
});
