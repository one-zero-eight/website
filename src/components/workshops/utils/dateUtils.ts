/**
 * Утилиты для работы с датами и временем
 */

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
 * Форматирует дату для отображения статуса (используется в WorkshopItem)
 * @param dateString - Дата в формате YYYY-MM-DD
 * @returns Дата в формате DD.MM.YYYY для статуса
 */
export const formatStartDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const previousDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const day = previousDay.getDate().toString().padStart(2, "0");
  const month = (previousDay.getMonth() + 1).toString().padStart(2, "0");
  const year = previousDay.getFullYear();
  return `${day}.${month}.${year}`;
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
    7: "Sunday"
  };
  return days[dayNumber as keyof typeof days] || "Unknown";
};

/**
 * Форматирует дату с днем недели для отображения в списке
 * @param dateString - Дата в формате YYYY-MM-DD
 * @returns Строка с датой и днем недели
 */
export const formatDateWithDay = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDay();
  const dayName = getDayName(day === 0 ? 7 : day); // Воскресенье = 0, делаем его 7
  const formattedDate = formatDate(dateString).split(".")[0];
  return `${dayName} ${formattedDate}`;
};

/**
 * Создает DateTime строку для API запроса
 * @param date - Дата в формате YYYY-MM-DD
 * @param time - Время в формате HH:mm
 * @returns ISO строка для API
 */
export const createDateTime = (date: string, time: string): string => {
  return `${date}T${time}`;
};

/**
 * Проверяет, прошла ли дата и время воркшопа
 * @param date - Дата воркшопа в формате YYYY-MM-DD
 * @param startTime - Время начала в формате HH:mm
 * @returns true если воркшоп уже прошел
 */
export const isWorkshopPast = (date: string, startTime: string): boolean => {
  if (!date || !startTime) return false;
  
  const now = new Date();
  const workshopDate = new Date(date);
  const [hours, minutes] = startTime.split(":").map(Number);
  workshopDate.setHours(hours, minutes, 0, 0);
  
  return workshopDate < now;
};
