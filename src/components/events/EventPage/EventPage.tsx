import { $workshops } from "@/api/workshops";
import { Description } from "./Description";
import { useNavigate } from "@tanstack/react-router";
import EventTitle from "./EventTitle";
import { useMe } from "@/api/accounts/user";
import { AuthWall } from "@/components/common/AuthWall";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage";
import MobileMenu from "./MobileMenu";
import Participants from "./Participants";
import { useState } from "react";

export interface EventPageProps {
  eventSlug: string;
}

export default function EventPage({ eventSlug }: EventPageProps) {
  const navigate = useNavigate();
  const { me } = useMe();

  const [language, setLanguage] = useState<string | null>(null);

  if (!me) {
    return <AuthWall />;
  }

  if (!me.telegram) {
    return (
      <div className="mb-10 flex h-full flex-col items-center justify-center gap-4 p-15">
        <img
          src="/favicon.svg"
          alt="InNoHassle logo"
          className="h-24 w-24 self-center"
        />
        <ConnectTelegramPage />
      </div>
    );
  }

  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: eventSlug } } },
  );

  const handleNavigateBack = () => {
    navigate({ to: "/events" });
  };

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
        <button className="btn btn-outline btn-sm" onClick={handleNavigateBack}>
          <span className="icon-[solar--arrow-left-linear] text-xl"></span>Go
          back
        </button>
      </div>
    );

  console.log(event);

  return (
    <>
      <div className="mb-[90px] px-4 md:mb-0 md:px-8 md:pt-4 lg:px-48 lg:pt-8">
        <EventTitle
          event={event}
          className="my-4"
          pageLanguage={language}
          setPageLanguage={setLanguage}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="col-span-1 md:col-span-2">
            <Description event={event} pageLanguage={language} />
          </div>
          <Participants event={event} />
        </div>
      </div>
      <MobileMenu event={event} />
    </>
  );
}
