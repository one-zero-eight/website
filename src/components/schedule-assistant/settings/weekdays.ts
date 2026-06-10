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

const WEEKDAY_API_TO_KEY: Record<string, TermWeekdayKey> = {
  monday: "Mon",
  mon: "Mon",
  tuesday: "Tue",
  tue: "Tue",
  wednesday: "Wed",
  wed: "Wed",
  thursday: "Thu",
  thu: "Thu",
  friday: "Fri",
  fri: "Fri",
  saturday: "Sat",
  sat: "Sat",
  sunday: "Sun",
  sun: "Sun",
};

function toTermWeekdayKey(raw: unknown): TermWeekdayKey | null {
  const lowered = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return null;
  if (WEEKDAY_API_TO_KEY[lowered]) return WEEKDAY_API_TO_KEY[lowered];
  if ((TERM_WEEKDAY_KEYS as readonly string[]).includes(String(raw)))
    return String(raw) as TermWeekdayKey;
  return null;
}

/** Приводит значение из конфига к списку известных ключей в порядке пн→вс. */
export function normalizeTermWeekdays(raw: unknown): TermWeekdayKey[] {
  const arr = Array.isArray(raw) ? raw : [];
  const set = new Set<TermWeekdayKey>();
  for (const item of arr) {
    const key = toTermWeekdayKey(item);
    if (key) set.add(key);
  }
  return TERM_WEEKDAY_KEYS.filter((k) => set.has(k));
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
