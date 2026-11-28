export function formatEventInterval(
  event: { starts_at: string; ends_at?: string | null; all_day: boolean },
  locale: string,
): string {
  const format = (value: string) =>
    new Date(
      event.all_day ? `${value.slice(0, 10)}T12:00:00` : value,
    ).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(event.all_day ? {} : { hour: "2-digit", minute: "2-digit" }),
    });
  const start = format(event.starts_at);
  return !event.all_day && event.ends_at
    ? `${start} – ${format(event.ends_at)}`
    : start;
}
