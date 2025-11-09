import { workshopsTypes } from "@/api/workshops";
import { useMemo, useState } from "react";
import AddEventButton from "./AddEventButton";
import { sortWorkshops } from "./event-utils";
import { EventItem } from "./EventItem";

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
}

export function EventForDate({
  isoDate,
  workshops,
  showPreviousDates,
  eventForDateType = EventForDateType.USER,
  onAddWorkshop,
  onEditWorkshop,
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
      <div className="collapse-arrow collapse">
        <input type="checkbox" />
        <div className="collapse-title flex w-full flex-nowrap justify-between ps-11 pe-4 pb-1 select-none after:start-5 after:end-auto">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => setShouldShow(!shouldShow)}
          >
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
              className="btn-sm z-20"
            >
              Add
            </AddEventButton>
          )}
        </div>
        <div className="collapse-content">
          {workshops.length > 0 ? (
            <div className="mt-4 mb-1 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
              {sortWorkshops(workshops).map((workshop) => (
                <EventItem
                  key={workshop.id}
                  event={workshop}
                  edit={
                    eventForDateType === EventForDateType.ADMIN
                      ? () => (onEditWorkshop ? onEditWorkshop(workshop) : null)
                      : null
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
