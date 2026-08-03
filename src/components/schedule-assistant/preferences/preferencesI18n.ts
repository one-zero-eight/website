export type PreferencesLocale = "ru" | "en";

export const PREFERENCES_LOCALE_STORAGE_KEY =
  "schedule-assistant:preferences-locale";

export function readStoredPreferencesLocale(): PreferencesLocale {
  if (typeof window === "undefined") return "ru";
  const stored = window.localStorage.getItem(PREFERENCES_LOCALE_STORAGE_KEY);
  if (stored === "en" || stored === "ru") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "ru";
}

export function storePreferencesLocale(locale: PreferencesLocale) {
  window.localStorage.setItem(PREFERENCES_LOCALE_STORAGE_KEY, locale);
}

type PreferencesCopy = {
  title: string;
  instruction: string;
  save: string;
  preferred: string;
  discouraged: string;
  banned: string;
  hintTouch: string;
  hintDesktop: string;
};

export const PREFERENCES_COPY: Record<PreferencesLocale, PreferencesCopy> = {
  ru: {
    title: "Предпочтения по времени",
    instruction: "Нажмите уровень и нажмите на ячейки слотов в таблице.",
    save: "Сохранить",
    preferred: "Предпочтительно",
    discouraged: "Нежелательно",
    banned: "Запрещено",
    hintTouch:
      "Удерживайте и ведите пальцем, чтобы закрасить. Повторное нажатие тем же уровнем — сбросить.",
    hintDesktop: "ЛКМ — закрасить выбранным значением. ПКМ — сбросить ячейку.",
  },
  en: {
    title: "Time preferences",
    instruction: "Select a level and tap the time slots in the table.",
    save: "Save",
    preferred: "Preferred",
    discouraged: "Discouraged",
    banned: "Forbidden",
    hintTouch:
      "Hold and drag to paint. Tap again with the same level to clear.",
    hintDesktop: "LMB — paint with the selected level. RMB — clear the cell.",
  },
};
