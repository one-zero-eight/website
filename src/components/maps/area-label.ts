import type { SchemaArea } from "@/api/maps/types";
import type { Locale } from "@/locales/lib";

/** Prefer API `ru_title` / `title` for the active locale when present. */
export function getAreaTitle(
  area: Pick<SchemaArea, "title" | "ru_title">,
  locale: Locale | string,
): string {
  if (locale === "ru") {
    return area.ru_title?.trim() || area.title?.trim() || "";
  }
  return area.title?.trim() || area.ru_title?.trim() || "";
}

const LATIN_NAME = /^[A-Za-z -]+$/;
const CYRILLIC_NAME = /^[А-Яа-яЁёA-Za-z -]+$/;

/** People list often has EN and RU variants; show the ones matching the locale. */
export function getAreaPeople(
  people: string[] | undefined,
  locale: Locale | string,
): string[] {
  if (!people?.length) return [];

  if (locale === "ru") {
    const cyrillic = people.filter((name) => /[А-Яа-яЁё]/.test(name));
    if (cyrillic.length > 0) return cyrillic;
    return people.filter((name) => CYRILLIC_NAME.test(name));
  }

  const latin = people.filter((name) => LATIN_NAME.test(name));
  return latin.length > 0 ? latin : people;
}
