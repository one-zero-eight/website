import { $workshops } from "@/api/workshops";
import { Description } from "./Description";
import { Link } from "@tanstack/react-router";
import EventTitle from "./EventTitle";
import MobileMenu from "./MobileMenu";
import Participants from "./Participants";
import { useState } from "react";
import { $clubs } from "@/api/clubs";

export interface EventPageProps {
  eventId: string;
}

export default function EventPage({ eventId }: EventPageProps) {
  const [language, setLanguage] = useState<string | null>(null);

  const { data: eventUser } = $workshops.useQuery("get", "/users/me");
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: eventId } } },
  );

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  if (!event)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="text-xl font-semibold">404 - Event not found</span>
        <Link className="btn btn-outline btn-sm" to="/events">
          <span className="icon-[solar--arrow-left-linear] text-xl" />
          Go back
        </Link>
      </div>
    );

  return (
    <>
      <div className="mx-auto mb-[90px] w-full max-w-[1200px] px-4 md:mb-4">
        <EventTitle
          event={event}
          isAdmin={
            eventUser?.role === "admin" ||
            clubsUser?.leader_in_clubs.length !== 0
          }
          className="my-4"
          pageLanguage={language}
          setPageLanguage={setLanguage}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="col-span-1 md:col-span-2">
            <Description event={event} pageLanguage={language} />
          </div>
          <Participants event={event} hide={!eventUser} />
        </div>
      </div>
      <MobileMenu event={event} />
    </>
  );
}
