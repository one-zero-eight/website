import AddEventButton from "./AddEventButton";
import { EventItem } from "./EventItem";
import { SchemaWorkshop } from "@/api/workshops/types";
import { EventListType } from "./EventsList";
import clsx from "clsx";
import { useMemo } from "react";

export interface EventForDateProps {
  isoDate: string;
  events: SchemaWorkshop[];
  eventListType?: EventListType;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (event: SchemaWorkshop) => void;
}

export function EventForDate({
  isoDate,
  events,
  eventListType = EventListType.USER,
  onAddEvent,
  onEditEvent,
}: EventForDateProps) {
  const date = new Date(isoDate);

  const filteredEvents = useMemo(
    () =>
      eventListType === EventListType.USER
        ? events.filter((event) => !event.is_draft && event.is_active)
        : events,
    [events, eventListType],
  );

  if (filteredEvents.length === 0) return null;

  // if (filteredEvents.length === 0)
  //   return (
  //     <div className="col-span-full py-10 text-center text-xl">
  //       <h2 className="text-gray-500">No events found!</h2>
  //     </div>
  //   );

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  const showAddButton = eventListType === EventListType.ADMIN && onAddEvent;

  return (
    <div className="flex flex-col gap-2">
      <div className="divider divider-start text-2xl font-medium sm:text-3xl">
        {showAddButton && (
          <AddEventButton
            onClick={() => onAddEvent?.(isoDate)}
            className="btn-sm z-20"
          >
            Add
          </AddEventButton>
        )}
        {formattedDate}
      </div>

      <ItemsList
        events={filteredEvents}
        eventListType={eventListType}
        onEditEvent={onEditEvent}
      />
    </div>
  );
}

export interface ItemsListProps {
  events: SchemaWorkshop[];
  eventListType?: EventListType;
  onEditEvent?: (event: SchemaWorkshop) => void;
  className?: string;
}

export function ItemsList({
  events,
  eventListType,
  onEditEvent,
  className,
}: ItemsListProps) {
  if (events.length === 0)
    return (
      <div className="col-span-full w-full pt-10 text-center text-xl">
        <h2 className="text-gray-200">No events found!</h2>
      </div>
    );

  return (
    <div
      className={clsx(
        "my-4 grid w-full grid-cols-1 gap-5 @lg/content:grid-cols-1 @5xl/content:grid-cols-2 @7xl/content:grid-cols-3",
        className,
      )}
    >
      {events.map((event) => (
        <EventItem
          key={event.id}
          event={event}
          edit={
            eventListType === EventListType.ADMIN && onEditEvent
              ? () => onEditEvent(event)
              : undefined
          }
        />
      ))}
    </div>
  );
}
