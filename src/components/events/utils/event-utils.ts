import { workshopsTypes } from "@/api/workshops";
import { getDate, isWorkshopPast } from "./date-utils";
import {
  CheckInType,
  SchemaBadge,
  SchemaWorkshop,
  WorkshopLanguage,
} from "@/api/workshops/types";
import { MAX_CAPACITY, HOST_NONE } from "../constants";
import { EventFormState } from "../types";

/**
 * Parse club host string to array of club IDs
 * @param host Host string in format "club:<id>" or "club:<id1>;club:<id2>"
 * @returns Array of club IDs
 */
export function parseClubHost(host: string | null | undefined): string[] {
  if (!host || !host.includes("club:")) {
    return [];
  }
  return host
    .split(";")
    .filter((part) => part.startsWith("club:"))
    .map((part) => part.split(":")[1])
    .filter((id) => id);
}

/**
 * Format array of club IDs to host string
 * @param clubIds Array of club IDs
 * @returns Host string in format "club:<id>" or "club:<id1>;club:<id2>"
 */
export function formatClubHost(clubIds: string[]): string {
  if (clubIds.length === 0) {
    return "";
  }
  if (clubIds.length === 1) {
    return `club:${clubIds[0]}`;
  }
  return clubIds.map((id) => `club:${id}`).join(";");
}

/**
 * Creates an empty event object with default values
 * @param title - The title for the event
 * @returns Partial event object with default values
 */
export const emptyEvent = (
  title: string,
): Pick<
  SchemaWorkshop,
  | "english_name"
  | "russian_name"
  | "language"
  | "host"
  | "dtstart"
  | "dtend"
  | "is_draft"
  | "capacity"
  | "check_in_type"
> => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return {
    english_name: title,
    russian_name: title,
    language: WorkshopLanguage.both,
    host: HOST_NONE,
    dtstart: tomorrow.toISOString(),
    dtend: dayAfter.toISOString(),
    is_draft: true,
    capacity: MAX_CAPACITY,
    check_in_type: CheckInType.no_check_in,
  };
};

export const baseEventFormState: EventFormState = {
  english_name: "",
  english_description: "",
  russian_name: "",
  russian_description: "",
  badges: [],
  language: WorkshopLanguage.both,
  host: HOST_NONE,
  capacity: 1000,
  remain_places: 1000,
  is_registrable: false,
  place: "",
  date: "",
  dtstart: "",
  dtend: "",
  check_in_opens: "",
  check_in_date: "",
  check_in_on_open: true,
  is_draft: false,
  is_active: true,
  links: [],
  image_file_id: null,
  file: null,
  check_in_type: CheckInType.on_innohassle,
  check_in_link: null,
};

/**
 * Returns formatted language code for an event (EN, RU, or EN/RU)
 * @param workshop - The event/workshop object
 * @returns Formatted language string (EN, RU, EN/RU, or Unknown)
 */
export const eventLanguage = (
  workshop: workshopsTypes.SchemaWorkshop,
): string => {
  switch (workshop.language) {
    case "english":
      return "EN";
    case "russian":
      return "RU";
    case "both":
      return "EN/RU";
    default:
      return "Unknown";
  }
};

/**
 * Generates the image URL for an event
 * @param eventId - The event ID
 * @returns The image URL string
 */
export function imageLink(eventId: string) {
  return `${import.meta.env.VITE_WORKSHOPS_API_URL}/workshops/${eventId}/image`;
}

/**
 * Returns the event name based on its language setting
 * @param workshop - The event/workshop object
 * @returns The event name string or "Unknown"
 */
export const eventName = (workshop: SchemaWorkshop): string => {
  switch (workshop.language) {
    case "english":
      return workshop.english_name;
    case "russian":
      return workshop.russian_name;
    default:
      return "Unknown";
  }
};

/**
 * Checks if an event is active and available for registration
 * @param event - The event object to check
 * @returns True if the event is active and available for registration
 */
export const isWorkshopActive = (event: SchemaWorkshop): boolean => {
  if (!event.dtstart || !event.check_in_opens) {
    console.error("Event is incomplete");
    return true;
  }

  return (
    event.is_active &&
    event.is_registrable &&
    !isWorkshopPast(event.dtstart) &&
    new Date(event.check_in_opens).getTime() < Date.now() &&
    !event.is_draft
  );
};

/**
 * Returns the status text explaining why an event is inactive
 * @param event - The event object
 * @returns Status text string explaining the inactive state
 */
export const getInactiveStatusText = (
  event: workshopsTypes.SchemaWorkshop,
): string => {
  if (!event.dtstart || !event.check_in_opens) {
    console.error("Event is incomplete");
    return "Incomplete";
  }

  if (isWorkshopPast(event.dtstart)) {
    return "Outdated";
  }

  if (!event.is_active) {
    return "Hidden by admin";
  }

  if (event.is_draft) {
    return "Draft check in is unavailable";
  }

  if (new Date(event.check_in_opens).getTime() > Date.now()) {
    return `Check in opens ${event.check_in_opens.split("T")[0]}`;
  }

  if (!event.is_registrable) {
    return "Already checked in";
  } else {
    return "Inactive";
  }
};

/**
 * Calculates the number of people signed up for an event
 * @param event - The event object
 * @returns Number of signed-up participants
 */
export const getSignedPeopleCount = (
  event: workshopsTypes.SchemaWorkshop,
): number => {
  if (!event.capacity) {
    console.error("Event is incomplete");
    return 0;
  }

  if (event.remain_places !== undefined && event.capacity > 0) {
    return Math.max(0, event.capacity - event.remain_places);
  }
  return 0;
};

/**
 * Checks if an event has all the specified badges
 * @param event - The event object to check
 * @param badges - Array of badges to check for
 * @returns True if the event has all specified badges (or if badges array is empty)
 */
export const hasBadges = (event: SchemaWorkshop, badges: SchemaBadge[]) => {
  if (!badges.length) return true;

  return badges.every((badge) =>
    event.badges.some(
      (evBadge) =>
        evBadge.title === badge.title && evBadge.color === badge.color,
    ),
  );
};

/**
 * Checks if an event has the recommended badge
 * @param event - The event object to check
 * @returns True if the event has the recommended badge
 */
export const isEventRecommended = (event: SchemaWorkshop) => {
  return event.badges.some((badge) => badge.title === "recommended");
};

/**
 * Groups events by date and sorts them by recommendation status
 * @param events - Array of events to group
 * @returns Object with dates as keys and arrays of events as values
 */
export const groupEvents = <T extends workshopsTypes.SchemaWorkshop>(
  events: T[],
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.dtstart || !event.check_in_opens) {
      continue;
    }

    const dateTag = getDate(event.dtstart);
    if (!groups[dateTag]) {
      groups[dateTag] = [];
    }
    groups[dateTag].push(event);
  }

  Object.entries(groups).forEach(([_, events]) => {
    events
      .sort((a, b) => (a.dtstart || "").localeCompare(b.dtstart || ""))
      .sort((a, b) =>
        isEventRecommended(a) && !isEventRecommended(b) ? -1 : 1,
      );
  });

  return groups;
};
