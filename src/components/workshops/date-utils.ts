/**
 * Утилиты для работы с датами и временем
 */

export const getDate = (dt: string) => {
  return dt.split("T")[0];
};

/**
 * Парсит время из ISO строки в формат HH:mm
 * @param isoString - ISO строка с датой и временем
 * @returns Время в формате HH:mm
 */
export const parseTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toTimeString().substring(0, 5);
  } catch {
    return isoString.split("T")[1]?.split(".")[0]?.substring(0, 5) || "";
  }
};

/**
 * Форматирует время в читаемый формат
 * @param timeString - Время в формате HH:mm
 * @returns Отформатированное время
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return "";
  return timeString;
};

/**
 * Форматирует дату в локальный формат (русский)
 * @param dateString - Дата в формате YYYY-MM-DD
 * @returns Дата в формате DD.MM.YYYY
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU");
};

/**
 * Получает название дня недели по номеру
 * @param dayNumber - Номер дня недели (1-7, где 1 = понедельник)
 * @returns Название дня недели
 */
export const getDayName = (dayNumber: number): string => {
  const days = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  return days[dayNumber as keyof typeof days] || "Unknown";
};

/**
 * Проверяет, прошла ли дата и время воркшопа
 * @param dtstart - Дата воркшопа в формате ISO
 * @returns true если воркшоп уже прошел
 */
export const isWorkshopPast = (dtstart: string): boolean => {
  if (!dtstart) return false;

  const now = new Date();
  const workshopDate = new Date(dtstart);

  return workshopDate < now;
};
