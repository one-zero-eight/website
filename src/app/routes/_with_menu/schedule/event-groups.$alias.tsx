import { EventGroupPage } from "@/components/schedule/EventGroupPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_with_menu/schedule/event-groups/$alias",
)({
  component: function RouteComponent() {
    const { alias } = Route.useParams();
    return <EventGroupPage alias={alias} />;
  },
});
