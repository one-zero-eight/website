import { useMemo, useState } from "react";
import AddEventButton from "./AddEventButton";
import { EventItem } from "./EventItem";
import { SchemaWorkshop } from "@/api/workshops/types";

export enum EventForDateType {
  USER,
  ADMIN,
}

export interface EventForDateProps {
  isoDate: string;
  events: SchemaWorkshop[];
  eventForDateType?: EventForDateType;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (workshop: SchemaWorkshop) => void;
}

export function EventForDate({
  isoDate,
  events,
  eventForDateType = EventForDateType.USER,
  onAddEvent,
  onEditEvent,
}: EventForDateProps) {
  const date = useMemo(() => new Date(isoDate), [isoDate]);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isPreviousDate = date < startOfDay;

  const [shouldShow, setShouldShow] = useState<boolean>(!isPreviousDate);

  return (
    <>
      <div className="flex w-full flex-nowrap justify-between select-none">
        <div
          className="flex w-full cursor-pointer flex-col items-center gap-2"
          onClick={() => setShouldShow(!shouldShow)}
        >
          <div className="divider divider-start text-2xl font-medium sm:text-3xl">
            {eventForDateType === EventForDateType.ADMIN && (
              <AddEventButton
                onClick={() => (onAddEvent ? onAddEvent(isoDate) : null)}
                className="btn-sm z-20"
              >
                Add
              </AddEventButton>
            )}
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
      {events.length > 0 ? (
        <div className="my-4 grid w-full grid-cols-1 gap-5 @lg/content:grid-cols-1 @5xl/content:grid-cols-2 @7xl/content:grid-cols-3">
          {events.map((event: SchemaWorkshop) => (
            <EventItem
              key={event.id}
              event={event}
              edit={
                eventForDateType === EventForDateType.ADMIN
                  ? () => (onEditEvent ? onEditEvent(event) : null)
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
    </>
  );
}
