/**
 * Утилиты для компонентов workshops
 */

// Утилиты для работы с датами
export {
  parseTime,
  formatTime,
  formatDate,
  formatStartDate,
  getDayName,
  formatDateWithDay,
  createDateTime,
  isWorkshopPast,
} from "./dateUtils";

// Утилиты для работы с воркшопами
export {
  isWorkshopActive,
  getInactiveStatusText,
  getSignedPeopleCount,
  canRegisterForWorkshop,
  getParticipantsDisplayText,
  isUnlimitedWorkshop,
  groupWorkshopsByDate,
  sortWorkshopsByTime,
  transformWorkshopFromAPI,
} from "./workshopUtils";
