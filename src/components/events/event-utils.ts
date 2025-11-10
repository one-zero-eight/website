/**
 * Утилиты для работы с воркшопами
 */

import { workshopsTypes } from "@/api/workshops";
import { getDate, isWorkshopPast } from "./date-utils.ts";
import { SchemaBadge, SchemaWorkshop } from "@/api/workshops/types.ts";

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

export const eventName = (workshop: workshopsTypes.SchemaWorkshop): string => {
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
export const isWorkshopActive = (
  workshop: workshopsTypes.SchemaWorkshop,
): boolean => {
  return (
    workshop.is_active &&
    workshop.is_registrable &&
    !isWorkshopPast(workshop.dtstart) &&
    new Date(workshop.check_in_opens).getTime() < Date.now() &&
    !workshop.is_draft
  );
};

/**
 * Получает текст статуса неактивности воркшопа
 * @param workshop - Объект воркшопа
 * @returns Текст статуса для отображения
 */
export const getInactiveStatusText = (
  workshop: workshopsTypes.SchemaWorkshop,
): string => {
  // Проверяем, прошел ли воркшоп
  if (isWorkshopPast(workshop.dtstart)) {
    return "Outdated";
  }

  if (!workshop.is_active) {
    return "Hidden by admin";
  }

  if (workshop.is_draft) {
    return "Draft check in is unavailable";
  }

  if (new Date(workshop.check_in_opens).getTime() > Date.now()) {
    return `Check in opens ${workshop.check_in_opens.split("T")[0]}`;
  }

  if (!workshop.is_registrable) {
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
  events.forEach((event) => {
    const dateTag = getDate(event.dtstart);
    if (!groups[dateTag]) {
      groups[dateTag] = [];
    }
    groups[dateTag].push(event);
  });

  // Sort by recommendation
  Object.entries(groups).forEach(([_, events]) => {
    events.sort((a, b) =>
      isEventRecommended(a) && !isEventRecommended(b) ? -1 : 1,
    );
  });

  return groups;
};
