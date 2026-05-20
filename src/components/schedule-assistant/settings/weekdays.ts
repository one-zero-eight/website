/** Ключи дней недели в конфиге (`config.term.days`), как в Python-модели. */
export const TERM_WEEKDAY_KEYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export type TermWeekdayKey = (typeof TERM_WEEKDAY_KEYS)[number];

export const TERM_WEEKDAY_LABEL_RU: Record<TermWeekdayKey, string> = {
  Mon: "Пн",
  Tue: "Вт",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",
};

/** Приводит значение из конфига к списку известных ключей в порядке пн→вс. */
export function normalizeTermWeekdays(raw: unknown): TermWeekdayKey[] {
  const arr = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
  return TERM_WEEKDAY_KEYS.filter((k) => arr.includes(k));
}

export function toggleTermWeekday(
  selected: TermWeekdayKey[],
  key: TermWeekdayKey,
): TermWeekdayKey[] {
  const set = new Set(selected);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return TERM_WEEKDAY_KEYS.filter((k) => set.has(k));
}

/** Строка для превью списка дней (русские сокращения через запятую). */
export function formatTermWeekdaysRu(raw: unknown): string {
  return normalizeTermWeekdays(raw)
    .map((k) => TERM_WEEKDAY_LABEL_RU[k])
    .join(", ");
}
