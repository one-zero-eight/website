/**
 * Утилиты для работы с воркшопами
 */

import { workshopsTypes } from "@/api/workshops";
import { getDate, isWorkshopPast, parseTime } from "./date-utils.ts";

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
  const groups: Record<string, T[]> = {
    "2025-08-19": [],
    "2025-08-20": [],
    "2025-08-21": [],
    "2025-08-22": [],
    "2025-08-23": [],
  };

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
 * Сортирует воркшопы по времени начала
 * @param workshops - Массив воркшопов
 * @returns Отсортированный массив воркшопов
 */
export const sortWorkshopsByTime = <T extends workshopsTypes.SchemaWorkshop>(
  workshops: T[],
): T[] => {
  return workshops.sort((a, b) => {
    const [hoursA, minutesA] = parseTime(a.dtstart).split(":").map(Number);
    const [hoursB, minutesB] = parseTime(b.dtstart).split(":").map(Number);

    return hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
  });
};
