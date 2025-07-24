/**
 * Утилиты для работы с воркшопами
 */

import type { Workshop } from "../types";
import { isWorkshopPast } from "./dateUtils";
import { formatDate } from "./dateUtils";

/**
 * Проверяет, активен ли воркшоп
 * @param workshop - Объект воркшопа
 * @returns true если воркшоп активен и доступен для регистрации
 */
export const isWorkshopActive = (workshop: Workshop): boolean => {
  return workshop.isActive !== false && workshop.isRegistrable !== false;
};

/**
 * Получает текст статуса неактивности воркшопа
 * @param workshop - Объект воркшопа
 * @returns Текст статуса для отображения
 */
export const getInactiveStatusText = (workshop: Workshop): string => {
  // Проверяем, прошел ли воркшоп
  if (isWorkshopPast(workshop.date, workshop.startTime)) {
    return "Outdated";
  }

  if (workshop.isRegistrable === false && workshop.isActive !== false) {
    // Только isRegistrable false показываем дату и время начала
    return `Inactive due ${formatDate(workshop.date)} ${workshop.startTime}`;
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
export const getSignedPeopleCount = (workshop: Workshop): number => {
  if (workshop.remainPlaces !== undefined && workshop.maxPlaces > 0) {
    return Math.max(0, workshop.maxPlaces - workshop.remainPlaces);
  }
  return 0;
};

/**
 * Проверяет, можно ли записаться на воркшоп
 * @param workshop - Объект воркшопа
 * @param currentSignedCount - Текущее количество записанных
 * @returns true если можно записаться
 */
export const canRegisterForWorkshop = (workshop: Workshop, currentSignedCount: number): boolean => {
  if (!isWorkshopActive(workshop)) {
    return false;
  }
  
  if (workshop.maxPlaces <= 0) {
    return true; // Безлимитный воркшоп
  }
  
  return currentSignedCount < workshop.maxPlaces;
};

/**
 * Получает отображаемый текст для количества участников
 * @param workshop - Объект воркшопа
 * @param signedCount - Количество записанных участников
 * @returns Строка для отображения (например: "5/20" или "5/∞")
 */
export const getParticipantsDisplayText = (workshop: Workshop, signedCount: number): string => {
  if (workshop.maxPlaces >= 0) {
    if (workshop.maxPlaces === 500) {
      return `${signedCount}/∞`;
    }
    return `${signedCount}/${workshop.maxPlaces}`;
  }
  return "No limit on number of people";
};

/**
 * Определяет, является ли воркшоп безлимитным
 * @param workshop - Объект воркшопа
 * @returns true если воркшоп не имеет ограничений по количеству участников
 */
export const isUnlimitedWorkshop = (workshop: Workshop): boolean => {
  return workshop.maxPlaces === 500 || workshop.maxPlaces <= 0;
};

/**
 * Группирует воркшопы по дате
 * @param workshops - Массив воркшопов
 * @returns Объект с воркшопами, сгруппированными по датам
 */
export const groupWorkshopsByDate = <T extends Workshop>(workshops: T[]): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  
  workshops.forEach((workshop) => {
    const dateTag = workshop.date;
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
export const sortWorkshopsByTime = <T extends Workshop>(workshops: T[]): T[] => {
  return workshops.sort((a, b) => {
    const [hoursA, minutesA] = a.startTime.split(":").map(Number);
    const [hoursB, minutesB] = b.startTime.split(":").map(Number);
    
    return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
  });
};

/**
 * Трансформирует данные воркшопа с API в клиентский формат
 * @param apiWorkshop - Данные воркшопа с API
 * @returns Воркшоп в клиентском формате
 */
export const transformWorkshopFromAPI = (apiWorkshop: any): Workshop => {
  const parseTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toTimeString().substring(0, 5);
    } catch {
      return isoString.split("T")[1]?.split(".")[0]?.substring(0, 5) || "";
    }
  };

  return {
    id: apiWorkshop.id,
    title: apiWorkshop.name,
    body: apiWorkshop.description,
    date: apiWorkshop.dtstart.split("T")[0],
    startTime: parseTime(apiWorkshop.dtstart),
    endTime: parseTime(apiWorkshop.dtend),
    room: apiWorkshop.place,
    maxPlaces: apiWorkshop.capacity,
    remainPlaces: apiWorkshop.remain_places,
    isActive: apiWorkshop.is_active ?? true,
    isRegistrable: apiWorkshop.is_registrable ?? true,
  };
};
