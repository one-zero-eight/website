import { $workshops, workshopsTypes } from "@/api/workshops";
import { CheckInButton } from "@/components/events/CheckInButton.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import React from "react";
import { formatTime, parseTime } from "./date-utils.ts";
import { getSignedPeopleCount, isWorkshopActive } from "./event-utils.ts";

// TODO: GET RID OF THIS, FETCH FROM DB
export const recommendedWorkshops = [
  "37ef8aed-d973-44eb-8485-f54d62f54755",
  "158748f7-e215-48e6-af69-f36301c43a8b",
  "397f5a06-561c-4d4e-8087-a4ff8b592ef6",
  "e69d602f-4834-4b95-a803-d1e5c5808112",
  "0ecb5deb-b82b-4ccc-b39d-a59084a9e3b8",
  "877d5259-4819-4ef9-90ab-a2004bd061b0",
  "04d48270-05ec-4c00-ad76-8363046b924f",
  "6016fb2d-cb9b-438b-8819-80c82a78a3be",
];

export function EventItem({
  workshop,
  openDescription,
  edit,
}: {
  workshop: workshopsTypes.SchemaWorkshop;
  edit?: ((workshop: workshopsTypes.SchemaWorkshop) => void) | null;
  openDescription: () => void;
}) {
  const { data: myCheckins } = $workshops.useQuery("get", "/users/my_checkins");

  const checkedIn = !!myCheckins?.some((w) => w.id === workshop.id);
  const signedPeople = getSignedPeopleCount(workshop);
  const isRecommended = recommendedWorkshops.includes(workshop.id);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был не по кнопкам и не по ссылке на комнату
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest("a")) {
      openDescription();
    }
  };

  return (
    <div
      className={clsx(
        "bg-pagebg relative flex w-full cursor-pointer flex-col justify-between rounded-2xl border p-4 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out",
        isWorkshopActive(workshop)
          ? "hover:shadow-[0_8px_24px_rgba(120,0,255,0.3)]"
          : "border-primary/15",
        checkedIn
          ? "border-green-700/60 bg-linear-to-br from-green-600/20 to-green-700/10 shadow-[0_4px_16px_rgba(76,175,80,0.1)] hover:shadow-[0_8px_24px_rgba(76,175,80,0.4)] dark:border-green-500/60 dark:from-green-500/10 dark:to-green-500/5"
          : "border-primary/40",
      )}
      onClick={handleContentClick}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center justify-center rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          <span className="icon-[mdi--star] mr-1 text-xs" />
          Recommended
        </div>
      )}

      {/* Time & Availability */}
      <div className="flex items-center justify-between">
        {workshop.dtstart && workshop.dtend && (
          <span
            className={clsx(
              "text-primary flex items-center justify-start text-xs font-medium sm:text-[15px]",
              !isWorkshopActive(workshop) && "opacity-50",
            )}
          >
            {formatTime(parseTime(workshop.dtstart))} -{" "}
            {formatTime(parseTime(workshop.dtend))}
          </span>
        )}
        <span
          className={clsx(
            "text-primary flex items-center justify-end text-xs font-medium sm:text-[15px]",
            !isWorkshopActive(workshop) && "opacity-50",
          )}
        >
          {workshop.capacity >= 0
            ? workshop.capacity === 500
              ? signedPeople + "/"
              : signedPeople + "/" + workshop.capacity
            : "No limit on number of people"}
          {workshop.capacity === 500 && (
            <span className="icon-[mdi--infinity] mt-0.5"></span>
          )}
        </span>
      </div>

      <div>
        <h3
          className={clsx(
            "text-contrast my-0.5 overflow-hidden text-center text-sm leading-[1.2] font-semibold wrap-break-word sm:my-1.5 sm:text-lg sm:leading-[1.3]",
            !isWorkshopActive(workshop) && "opacity-50",
          )}
        >
          {workshop.name}
        </h3>
        {workshop.place && (
          <div
            className={clsx(
              "my-1 text-center sm:my-2",
              !isWorkshopActive(workshop) && "opacity-50",
            )}
          >
            <p className="text-contrast/80 m-0 text-xs sm:text-base">
              <strong>Room:</strong>{" "}
              <Link
                to="/maps"
                search={{ q: workshop.place }}
                className="text-primary hover:text-primary/80 relative cursor-pointer underline"
                title="Click to view on map"
              >
                {workshop.place}
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Показываем кнопки управления только для администраторов */}
      {edit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            edit(workshop);
          }}
          className="border-primary/20 bg-inh-primary/80 text-primary hover:border-primary/40 hover:bg-primary/20 hover:text-primary/80 absolute right-1.5 bottom-1.5 flex cursor-pointer items-center justify-center rounded-md border p-1.5 backdrop-blur-md transition-all duration-300 ease-in-out hover:scale-110 sm:right-3 sm:bottom-3 sm:rounded-xl sm:p-2.5"
          title="Edit workshop"
        >
          <span className="icon-[mynaui--pencil] text-base sm:text-xl" />
        </button>
      )}

      <div className="flex items-center justify-center">
        <CheckInButton workshopId={workshop.id} className="max-w-fit" />
      </div>
    </div>
  );
}
