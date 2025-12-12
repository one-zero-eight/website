import { EventItem } from "./EventItem";
import clsx from "clsx";
import { useMemo } from "react";
import { EventForDateProps, EventListType, ItemsListProps } from "./types";

export function EventForDate({
  isoDate,
  events,
  eventListType = EventListType.USER,
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

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="divider divider-start text-2xl font-medium sm:text-3xl">
        {formattedDate}
      </div>

      <ItemsList events={filteredEvents} eventListType={eventListType} />
    </div>
  );
}

export function ItemsList({
  events,
  eventListType,
  className,
}: ItemsListProps) {
  if (events.length === 0) {
    return (
      <div className="col-span-full w-full pt-10 text-center text-xl">
        <h2 className="text-gray-200">No events found!</h2>
      </div>
    );
  }

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
          isEditable={eventListType === EventListType.ADMIN}
        />
      ))}
    </div>
  );
}
