import { $workshops } from "@/api/workshops";
import { Description } from "./EventPage/Description";
import { useNavigate } from "@tanstack/react-router";
import EventTitle from "./EventPage/EventTitle";

export interface EventPageProps {
  eventSlug: string;
}

export default function EventPage({ eventSlug }: EventPageProps) {
  const navigate = useNavigate();

  const { data: workshops, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/",
  );
  const workshop = workshops?.find((w) => w.id === eventSlug);

  const handleNavigateBack = () => {
    navigate({ to: "/events" });
  };

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  if (!workshop)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="text-xl font-semibold">404 - Event not found</span>
        <button className="btn btn-outline btn-sm" onClick={handleNavigateBack}>
          <span className="icon-[solar--arrow-left-linear] text-xl"></span>Go
          back
        </button>
      </div>
    );

  return (
    <div className="px-4">
      <EventTitle workshop={workshop} className="my-4" />
      <Description workshop={workshop} />
    </div>
  );
}
