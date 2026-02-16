import { EventItem } from "./EventItem";
import clsx from "clsx";
import { useMemo } from "react";
import {
  DEFAULT_EVENT_LIST_OPTIONS,
  EventForDateProps,
  ItemsListProps,
} from "./types";

export function EventForDate({
  isoDate,
  events,
  options: optionsProp,
  myCheckins,
  clubsList,
}: EventForDateProps) {
  const options = { ...DEFAULT_EVENT_LIST_OPTIONS, ...optionsProp };
  const date = new Date(isoDate);

  const filteredEvents = useMemo(
    () =>
      options.filterDraftsAndInactive
        ? events.filter((event) => !event.is_draft && event.is_active)
        : events,
    [events, options.filterDraftsAndInactive],
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

      <ItemsList
        events={filteredEvents}
        myCheckins={myCheckins}
        clubsList={clubsList}
      />
    </div>
  );
}

export function ItemsList({
  events,
  myCheckins,
  clubsList,
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
          myCheckins={myCheckins}
          clubsList={clubsList}
        />
      ))}
    </div>
  );
}
