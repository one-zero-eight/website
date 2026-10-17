export type Milestone = {
  id: string;
  title: string;
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  time: string;
};

export type HackatonPlan = {
  title: string;
  start: string;
  finish: string;
  milestones: Milestone[];
};

const HOUR_MS = 60 * 60 * 1000;

export function toInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function createInitialPlan(): HackatonPlan {
  const now = Date.now();
  const at = (hoursFromNow: number) =>
    toInputValue(new Date(now + hoursFromNow * HOUR_MS));

  return {
    title: "Release sprint",
    start: at(-3),
    finish: at(30),
    milestones: [
      { id: "kickoff", title: "Kickoff call", time: at(-2) },
      { id: "lecture", title: "Lecture on architecture", time: at(1) },
      { id: "sync", title: "Sync on tasks", time: at(5) },
      { id: "freeze", title: "Feature freeze", time: at(18) },
      { id: "demo", title: "Demo rehearsal", time: at(26) },
    ],
  };
}

export function sortMilestones(milestones: Milestone[]) {
  return [...milestones].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

export function formatDateTime(time: string) {
  return new Date(time).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isUnderHour = totalSeconds < 3600;
  const clock = (isUnderHour ? [minutes, seconds] : [hours, minutes, seconds])
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return { days, clock };
}
