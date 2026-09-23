function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "13.09.2026" in the viewer's time zone; empty string for a missing date */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "13.09.2026, 18:40" in the viewer's time zone */
export function formatDayTime(iso: string | null | undefined): string {
  const day = formatDay(iso);
  if (!day) return "";
  const d = new Date(iso!);
  return `${day}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
