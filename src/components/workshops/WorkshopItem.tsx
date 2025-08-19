import { $workshops, workshopsTypes } from "@/api/workshops";
import { CheckInButton } from "@/components/workshops/CheckInButton.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import React from "react";
import { formatTime, parseTime } from "./date-utils.ts";
import { getSignedPeopleCount, isWorkshopActive } from "./workshop-utils.ts";

export const recommendedWorkshops = [
  "397f5a06-561c-4d4e-8087-a4ff8b592ef6",
  "e69d602f-4834-4b95-a803-d1e5c5808112",
  "0ecb5deb-b82b-4ccc-b39d-a59084a9e3b8",
];

export function WorkshopItem({
  workshop,
  openDescription,
  edit,
}: {
  workshop: workshopsTypes.SchemaWorkshop;
  edit?: (workshop: workshopsTypes.SchemaWorkshop) => void;
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
        "relative w-full cursor-pointer rounded-2xl border bg-primary p-4 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isWorkshopActive(workshop)
          ? "hover:shadow-[0_8px_24px_rgba(120,0,255,0.3)]"
          : "border-brand-violet/15",
        checkedIn
          ? "border-green-700/60 bg-gradient-to-br from-green-600/20 to-green-700/10 shadow-[0_4px_16px_rgba(76,175,80,0.1)] hover:shadow-[0_8px_24px_rgba(76,175,80,0.4)] dark:border-green-500/60 dark:from-green-500/10 dark:to-green-500/5"
          : "border-brand-violet/40",
      )}
      onClick={handleContentClick}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -right-2 -top-2 z-10 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          <span className="icon-[mdi--star] mr-1 text-xs" />
          Recommended
        </div>
      )}

      <div className="flex items-center justify-between">
        {workshop.dtstart && workshop.dtend && (
          <p
            className={clsx(
              "flex items-center justify-start text-xs font-medium text-brand-violet sm:text-[15px]",
              !isWorkshopActive(workshop) && "opacity-50",
            )}
          >
            {formatTime(parseTime(workshop.dtstart))} -{" "}
            {formatTime(parseTime(workshop.dtend))}
          </p>
        )}
        <p
          className={clsx(
            "flex items-center justify-end text-xs font-medium text-brand-violet sm:text-[15px]",
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
        </p>
      </div>
      <h3
        className={clsx(
          "my-0.5 mb-1 overflow-hidden break-words text-sm font-semibold leading-[1.2] text-contrast sm:my-1.5 sm:mb-2 sm:text-lg sm:leading-[1.3]",
          !isWorkshopActive(workshop) && "opacity-50",
        )}
      >
        {workshop.name}
      </h3>
      {workshop.place && (
        <div
          className={clsx(
            "my-1 sm:my-2",
            !isWorkshopActive(workshop) && "opacity-50",
          )}
        >
          <p className="m-0 text-xs text-contrast/80 sm:text-base">
            <strong>Room:</strong>{" "}
            <Link
              to="/maps"
              search={{ q: workshop.place }}
              className="relative cursor-pointer text-brand-violet underline hover:text-brand-violet/80"
              title="Click to view on map"
            >
              {workshop.place}
            </Link>
          </p>
        </div>
      )}

      {/* Показываем кнопки управления только для администраторов */}
      {edit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            edit(workshop);
          }}
          className="absolute bottom-1.5 right-1.5 flex cursor-pointer items-center justify-center rounded-md border border-brand-violet/20 bg-primary/80 p-1.5 text-brand-violet backdrop-blur-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-brand-violet/40 hover:bg-brand-violet/20 hover:text-brand-violet/80 sm:bottom-3 sm:right-3 sm:rounded-xl sm:p-2.5"
          title="Edit workshop"
        >
          <span className="icon-[mynaui--pencil] text-base sm:text-xl" />
        </button>
      )}

      <div className="flex justify-center">
        <CheckInButton workshopId={workshop.id} />
      </div>
    </div>
  );
}
