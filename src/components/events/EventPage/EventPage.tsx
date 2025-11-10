import { $workshops } from "@/api/workshops";
import { Description } from "./Description";
import { Link } from "@tanstack/react-router";
import EventTitle from "./EventTitle";
import MobileMenu from "./MobileMenu";
import Participants from "./Participants";
import { useState } from "react";
import { ModalWindow } from "../EventCreationModal/ModalWindow";
import { CreationForm } from "../EventCreationModal/CreationForm";

export interface EventPageProps {
  eventSlug: string;
}

export default function EventPage({ eventSlug }: EventPageProps) {
  const [language, setLanguage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: eventUser } = $workshops.useQuery("get", "/users/me");

  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: eventSlug } } },
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
      <div className="mb-[90px] px-4 md:mb-0 md:px-8 md:py-4 lg:px-48 lg:py-8">
        <EventTitle
          event={event}
          openModal={eventUser?.role === "admin" ? setModalOpen : null}
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

      {/* Модальное окно для создания/редактирования воркшопа */}
      {eventUser?.role === "admin" && (
        <ModalWindow
          open={modalOpen}
          onOpenChange={() => {
            setModalOpen(false);
          }}
          title={"Edit Event"}
        >
          {/* Форма создания/редактирования воркшопа. При редактировании передаются данные существующего воркшопа */}
          <CreationForm
            initialEvent={event}
            onClose={() => {
              setModalOpen(false);
            }}
          />
        </ModalWindow>
      )}
    </>
  );
}
