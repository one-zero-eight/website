import { EventItem } from "./EventItem";
import clsx from "clsx";
import { useMemo } from "react";
import {
  DEFAULT_EVENT_LIST_OPTIONS,
  EventForDateProps,
  ItemsListProps,
} from "./types";
import { HostType } from "@/api/workshops/types";
import type { SchemaWorkshop } from "@/api/workshops/types";

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
        options={options}
        myCheckins={myCheckins}
        clubsList={clubsList}
      />
    </div>
  );
}

function isEventEditableForUser(
  event: SchemaWorkshop,
  isEditable: boolean,
  editableClubIds: string[],
): boolean {
  if (isEditable) return true;
  if (editableClubIds.length === 0) return false;
  const host = event.host ?? [];
  return host.some(
    (h) =>
      (h?.host_type === HostType.club || String(h?.host_type) === "club") &&
      h?.name &&
      editableClubIds.includes(h.name),
  );
}

export function ItemsList({
  events,
  options: optionsProp,
  myCheckins,
  clubsList,
  className,
}: ItemsListProps) {
  const options = {
    ...DEFAULT_EVENT_LIST_OPTIONS,
    ...optionsProp,
    editableClubIds: optionsProp?.editableClubIds ?? [],
  };

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
          isEditable={isEventEditableForUser(
            event,
            options.isEditable,
            options.editableClubIds,
          )}
          myCheckins={myCheckins}
          clubsList={clubsList}
        />
      ))}
    </div>
  );
}
