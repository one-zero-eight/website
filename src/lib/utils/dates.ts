export const T = {
  Ms: 1,
  Sec: 1000,
  Min: 1000 * 60,
  Hour: 1000 * 60 * 60,
  Day: 1000 * 60 * 60 * 24,
};

export function durationFormatted(durationMs: number): string {
  const hours = Math.floor(durationMs / T.Hour);
  const minutes = Math.floor((durationMs % T.Hour) / T.Min);
  return [hours > 0 ? `${hours}h` : "", minutes > 0 ? `${minutes}m` : ""]
    .filter(Boolean)
    .join(" ");
}

export function msBetween(a: Date | number, b: Date | number) {
  return (
    (b instanceof Date ? b.getTime() : b) -
    (a instanceof Date ? a.getTime() : a)
  );
}

export function clockTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
