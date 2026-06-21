import { Topbar } from "@/components/layout/Topbar.tsx";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { BookRoomPage } from "@/components/when2meet/BookRoomPage.tsx";
import {
  backendSlotToSlotKey,
  parseBackendSlots,
} from "@/components/when2meet/utils/api-slots.ts";
import { getStoredAllowedSlots } from "@/components/when2meet/utils/setup-slots.ts";
import { formatMeetingDates } from "@/components/when2meet/utils/slots.ts";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute(
  "/_with_menu/when2meet/$meetingId/book-room",
)({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): { name?: string; slot?: string } => {
    return {
      name: search.name ? search.name.toString() : undefined,
      slot: search.slot ? search.slot.toString() : undefined,
    };
  },
});

function participantsToUsers(
  participants: { name: string; availability: string[] }[],
) {
  return participants.map((participant) => ({
    id: participant.name,
    name: participant.name,
    slots: new Set(participant.availability.map(backendSlotToSlotKey)),
    ifNeededSlots: new Set<string>(),
  }));
}

function RouteComponent() {
  const { meetingId } = Route.useParams();
  const { name, slot } = Route.useSearch();

  const {
    data: event,
    isPending,
    isError,
    error,
  } = $when2meet.useQuery("get", "/events/{event_id}", {
    params: { path: { event_id: meetingId } },
  });

  const parsedSlots = useMemo(
    () => (event ? parseBackendSlots(event.slots) : null),
    [event],
  );

  const formattedDates = useMemo(
    () => formatMeetingDates(parsedSlots?.dates ?? []),
    [parsedSlots],
  );

  const timeSlots = useMemo(() => parsedSlots?.timeSlots ?? [], [parsedSlots]);
  const canvasSlots = useMemo(
    () => new Set(parsedSlots?.slotKeys ?? []),
    [parsedSlots],
  );

  const allowedSlots = useMemo(() => {
    const stored = getStoredAllowedSlots(meetingId);
    if (stored && stored.size > 0) {
      return stored;
    }
    return canvasSlots;
  }, [meetingId, canvasSlots]);

  const users = useMemo(
    () => (event ? participantsToUsers(event.participants) : []),
    [event],
  );

  if (isPending) {
    return (
      <>
        <Topbar title="When2Meet" hideOnMobile={true} />
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="skeleton h-8 w-48" />
        </div>
      </>
    );
  }

  if (isError || !event) {
    return (
      <>
        <Topbar title="When2Meet" hideOnMobile={true} />
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Book room | {name ?? event.name}</title>
      </Helmet>
      <Topbar title="When2Meet" hideOnMobile={true} />
      <BookRoomPage
        meetingId={meetingId}
        meetingName={event.name ?? name ?? "Meeting"}
        users={users}
        dates={formattedDates}
        timeSlots={timeSlots}
        allowedSlots={allowedSlots}
        selectedSlotKey={slot}
      />
    </>
  );
}
