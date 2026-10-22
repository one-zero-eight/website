import { i18n, type Messages } from "@lingui/core";
import moment from "moment";
import "moment/locale/ru.js";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { messages as enMessages } from "./en.po";
import { messages as pseudoLocaleMessages } from "./pseudo-LOCALE.po";
import { messages as ruMessages } from "./ru.po";

export const LOCALE_STORAGE_KEY = "locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "ru"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const isLocale = (value: string | null): value is Locale => {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ru: "RU",
};

export const getLocaleLabel = (locale: string): string => {
  if (isLocale(locale)) {
    return LOCALE_LABELS[locale];
  }

  return locale.toUpperCase();
};

let isI18nLoaded = false;

const catalogs: Record<string, Messages> = {
  en: enMessages,
  ru: ruMessages,
  "pseudo-LOCALE": pseudoLocaleMessages,
};

export const getInitialLocale = (): Locale => {
  try {
    const storedLocale = JSON.parse(
      window.localStorage.getItem(LOCALE_STORAGE_KEY) || "null",
    );
    if (!isLocale(storedLocale)) {
      return DEFAULT_LOCALE;
    }

    return storedLocale;
  } catch (error) {
    console.error("Error getting initial locale from localStorage", error);
    return DEFAULT_LOCALE;
  }
};

export const activateLocale = (locale: Locale) => {
  moment.locale(locale);
  document.documentElement.lang = locale;
  i18n.activate(locale);
};

const loadCatalogs = () => {
  i18n.load(catalogs);
};

export const useAppLocale = () => {
  const [locale, setLocaleState] = useLocalStorage<Locale>(
    LOCALE_STORAGE_KEY,
    DEFAULT_LOCALE,
  );

  const setLocale = (next: Locale) => {
    // Activate before React re-renders so moment/i18n match the new locale
    // in the same paint as components that format dates.
    activateLocale(next);
    setLocaleState(next);
  };

  useEffect(() => {
    activateLocale(locale);
  }, [locale]);

  return [locale, setLocale] as const;
};

export const initializeI18n = (): Locale => {
  if (!isI18nLoaded) {
    loadCatalogs();
    isI18nLoaded = true;
  }

  const initialLocale = getInitialLocale();
  activateLocale(initialLocale);
  return initialLocale;
};

// Activate during module evaluation so ESM imports that call `i18n._` at
// module scope (before entry-client body runs) already have a locale.
initializeI18n();

if (import.meta.hot) {
  import.meta.hot.accept(
    ["./en.po", "./ru.po", "./pseudo-LOCALE.po"],
    ([enMod, ruMod, pseudoMod]) => {
      if (enMod?.messages) {
        catalogs.en = enMod.messages;
      }
      if (ruMod?.messages) {
        catalogs.ru = ruMod.messages;
      }
      if (pseudoMod?.messages) {
        catalogs["pseudo-LOCALE"] = pseudoMod.messages;
      }

      loadCatalogs();
      if (isLocale(i18n.locale)) {
        activateLocale(i18n.locale);
      }
    },
  );
}
