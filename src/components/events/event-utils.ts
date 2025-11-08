/**
 * Утилиты для работы с воркшопами
 */

import { workshopsTypes } from "@/api/workshops";
import { recommendedWorkshops } from "@/components/events/EventItem.tsx";
import { getDate, isWorkshopPast, parseTime } from "./date-utils.ts";

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
  return workshop.is_active && workshop.is_registrable;
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

  if (!workshop.is_registrable) {
    return "Can check in only 24 hours before";
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
  workshop: workshopsTypes.SchemaWorkshop,
): number => {
  if (workshop.remain_places !== undefined && workshop.capacity > 0) {
    return Math.max(0, workshop.capacity - workshop.remain_places);
  }
  return 0;
};

/**
 * Группирует воркшопы по дате
 * @param workshops - Массив воркшопов
 * @returns Объект с воркшопами, сгруппированными по датам
 */
export const groupWorkshopsByDate = <T extends workshopsTypes.SchemaWorkshop>(
  workshops: T[],
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};

  workshops.forEach((workshop) => {
    const dateTag = getDate(workshop.dtstart);
    if (!groups[dateTag]) {
      groups[dateTag] = [];
    }
    groups[dateTag].push(workshop);
  });

  return groups;
};

/**
 * Сортирует воркшопы
 * @param workshops - Массив воркшопов
 * @returns Отсортированный массив воркшопов
 */
export const sortWorkshops = <T extends workshopsTypes.SchemaWorkshop>(
  workshops: T[],
): T[] => {
  return workshops.sort((a, b) => {
    const isRecommendedA = recommendedWorkshops.indexOf(a.id);
    const isRecommendedB = recommendedWorkshops.indexOf(b.id);
    if (isRecommendedB !== isRecommendedA) {
      return isRecommendedA > isRecommendedB ? -1 : 1; // Сначала рекомендованные
    }

    const [hoursA, minutesA] = parseTime(a.dtstart).split(":").map(Number);
    const [hoursB, minutesB] = parseTime(b.dtstart).split(":").map(Number);
    const result = hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
    if (result !== 0) {
      return result; // Сначала ранние
    }

    return a.id.localeCompare(b.id); // Сначала по ID
  });
};
