import { workshopsTypes } from "@/api/workshops";
import clsx from "clsx";
import { useMemo, useState } from "react";
import AddEventButton from "./AddEventButton";
import { sortWorkshops } from "./workshop-utils";
import { WorkshopItem } from "./WorkshopItem";

export enum EventForDateType {
  USER,
  ADMIN,
}

export interface EventForDateProps {
  isoDate: string;
  workshops: workshopsTypes.SchemaWorkshop[];
  showPreviousDates: boolean;
  eventForDateType?: EventForDateType;
  onAddWorkshop?: (date: string) => void;
  onEditWorkshop?: (workshop: workshopsTypes.SchemaWorkshop) => void;
  onSelect?: (workshop: workshopsTypes.SchemaWorkshop) => void;
}

export function EventForDate({
  isoDate,
  workshops,
  showPreviousDates,
  eventForDateType = EventForDateType.USER,
  onAddWorkshop,
  onEditWorkshop,
  onSelect,
}: EventForDateProps) {
  const date = useMemo(() => new Date(isoDate), [isoDate]);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isPreviousDate = date < startOfDay;

  const [shouldShow, setShouldShow] = useState<boolean>(!isPreviousDate);

  if (isPreviousDate && !showPreviousDates) {
    return null;
  }

  return (
    <>
      <div className="my-1 flex w-full flex-col items-start border-b border-neutral-700 pb-4 last:border-0">
        <div className="flex w-full flex-nowrap justify-between">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => setShouldShow(!shouldShow)}
          >
            <span
              className={clsx(
                "icon-[material-symbols--keyboard-arrow-down-rounded] pt-2 text-2xl text-white transition-transform",
                shouldShow && "-rotate-z-90",
              )}
            />
            <div className="text-2xl font-medium sm:text-3xl">
              {date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          {eventForDateType === EventForDateType.ADMIN && (
            <AddEventButton
              onClick={() => (onAddWorkshop ? onAddWorkshop(isoDate) : null)}
              className="max-w-fit px-1.5! py-1! pr-2! md:px-2 md:py-1"
            >
              Add
            </AddEventButton>
          )}
        </div>
        <div className={clsx(shouldShow ? "block" : "hidden")}>
          {workshops.length > 0 ? (
            <div className="mt-4 mb-1 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
              {sortWorkshops(workshops).map((workshop) => (
                <WorkshopItem
                  key={workshop.id}
                  workshop={workshop}
                  edit={
                    eventForDateType === EventForDateType.ADMIN
                      ? () => (onEditWorkshop ? onEditWorkshop(workshop) : null)
                      : null
                  }
                  openDescription={
                    eventForDateType === EventForDateType.ADMIN
                      ? () => (onEditWorkshop ? onEditWorkshop(workshop) : null)
                      : () => (onSelect ? onSelect(workshop) : null)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="col-span-full w-full text-left text-xl">
              <h2 className="text-gray-500">No workshops yet!</h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
