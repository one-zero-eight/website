/**
 * Утилиты для работы с воркшопами
 */

import { workshopsTypes } from "@/api/workshops";
import { getDate, isWorkshopPast } from "./date-utils.ts";
import {
  SchemaBadge,
  SchemaWorkshop,
  WorkshopLanguage,
} from "@/api/workshops/types.ts";
import { MAX_CAPACITY } from "./EventEditPage/DateTime.tsx";
import { GenericBadgeFormScheme } from "./EventEditPage/TagsSelector.tsx";

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
> => {
  return {
    english_name: title,
    russian_name: title,
    language: WorkshopLanguage.both,
    host: "None",
    dtstart: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    dtend: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_draft: true,
    capacity: MAX_CAPACITY,
  };
};

export type EventLink = {
  id: number;
  title: string;
  url: string;
};

export type EventFormState = Omit<
  SchemaWorkshop,
  "id" | "created_at" | "badges"
> &
  GenericBadgeFormScheme & {
    date: string;
    check_in_date: string;
    check_in_on_open: boolean;
    links: EventLink[];
  };

// Base (Empty) state for event creation form
export const baseEventFormState: EventFormState = {
  english_name: "",
  english_description: "",
  russian_name: "",
  russian_description: "",
  badges: [],
  language: WorkshopLanguage.both,
  host: "",
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
};

/**
 * Returns formateted language of a workshop e.g. "EN/RU"
 * @param workshop workshop object
 * @returns formated language string
 */
export const eventLangauage = (
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
 * Проверяет, активен ли воркшоп
 * @param workshop - Объект воркшопа
 * @returns true если воркшоп активен и доступен для регистрации
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
 * Получает текст статуса неактивности воркшопа
 * @param event - Объект воркшопа
 * @returns Текст статуса для отображения
 */
export const getInactiveStatusText = (
  event: workshopsTypes.SchemaWorkshop,
): string => {
  if (!event.dtstart || !event.check_in_opens) {
    console.error("Event is incomplete");
    return "Incomplete";
  }

  // Проверяем, прошел ли воркшоп
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
    // isActive false или оба false просто Inactive
    return "Inactive";
  }
};

/**
 * Подсчитывает количество записанных людей на воркшоп
 * @param workshop - Объект воркшопа
 * @returns Количество записанных участников
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

export const hasBadges = (event: SchemaWorkshop, badges: SchemaBadge[]) => {
  if (!badges.length) return true; // no filter means all pass

  return badges.every((badge) =>
    event.badges.some(
      (evBadge) =>
        evBadge.title === badge.title && evBadge.color === badge.color,
    ),
  );
};

export const isEventRecommended = (event: SchemaWorkshop) => {
  return event.badges.some((badge) => badge.title === "recommended");
};

/**
 * Group events by dates and then sorts by recommendation
 * @param events - events array
 * @returns Объект с воркшопами, сгруппированными по датам
 */
export const groupEvents = <T extends workshopsTypes.SchemaWorkshop>(
  events: T[],
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};

  // Group
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

  // Sort by recommendation
  Object.entries(groups).forEach(([_, events]) => {
    events
      .sort((a, b) => (a.dtstart || "").localeCompare(b.dtstart || ""))
      .sort((a, b) =>
        isEventRecommended(a) && !isEventRecommended(b) ? -1 : 1,
      );
  });

  return groups;
};
