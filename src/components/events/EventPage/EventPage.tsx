import { $workshops } from "@/api/workshops";
import { Description } from "./Description";
import { Link } from "@tanstack/react-router";
import EventTitle from "./EventTitle";
import MobileMenu from "./MobileMenu";
import Participants from "./Participants";
import { useMemo, useState } from "react";
import { $clubs } from "@/api/clubs";
import { CheckInType, HostType } from "@/api/workshops/types";
import { useEventsAuth } from "../hooks";

export interface EventPageProps {
  eventId: string;
}

export default function EventPage({ eventId }: EventPageProps) {
  const [language, setLanguage] = useState<string | null>(null);

  const { eventsUser: eventUser, clubsUser } = useEventsAuth();
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");
  const { data: clubsList = [] } = $clubs.useQuery("get", "/clubs/");

  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: eventId } } },
  );

  const canEdit = useMemo(() => {
    if (!event) return false;
    if (eventUser?.role === "admin") return true;
    const leaderClubIds = clubsUser?.leader_in_clubs.map((c) => c.id) ?? [];
    if (leaderClubIds.length === 0) return false;
    const host = event.host ?? [];
    return host.some(
      (h) =>
        (h?.host_type === HostType.club || String(h?.host_type) === "club") &&
        h?.name &&
        leaderClubIds.includes(h.name),
    );
  }, [event, eventUser?.role, clubsUser?.leader_in_clubs]);

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
          canEdit={canEdit}
          className="my-4"
          pageLanguage={language}
          setPageLanguage={setLanguage}
          myCheckins={myCheckins}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="col-span-1 md:col-span-2">
            <Description event={event} pageLanguage={language} />
          </div>
          <Participants
            event={event}
            hide={
              !eventUser || event.check_in_type !== CheckInType.on_innohassle
            }
            clubsList={clubsList}
          />
        </div>
      </div>
      <MobileMenu event={event} myCheckins={myCheckins} />
    </>
  );
}
