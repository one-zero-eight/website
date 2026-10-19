import { i18n, type Messages } from "@lingui/core";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { messages as enMessages } from "./en.po";
import { messages as pseudoLocaleMessages } from "./pseudo-LOCALE.po";
import { messages as ruMessages } from "./ru.po";

export const LOCALE_STORAGE_KEY = "locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "ru"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

let isI18nLoaded = false;

const catalogs: Record<string, Messages> = {
  en: enMessages,
  ru: ruMessages,
  "pseudo-LOCALE": pseudoLocaleMessages,
};

const isLocale = (value: string | null): value is Locale => {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
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
  i18n.activate(locale);
  document.documentElement.lang = locale;
};

const loadCatalogs = () => {
  i18n.load(catalogs);
};

export const useAppLocale = () => {
  const [locale, setLocale] = useLocalStorage<Locale>(
    LOCALE_STORAGE_KEY,
    DEFAULT_LOCALE,
  );

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
