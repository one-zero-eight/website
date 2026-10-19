export type Milestone = {
  id: string;
  title: string;
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  time: string;
};

export type HackathonTimer = {
  id: string;
  /** Five latin letters. Exists only after the owner created a join code. */
  joinCode: string | null;
  title: string;
  ownerName: string;
  isOwner: boolean;
  start: string;
  finish: string;
  milestones: Milestone[];
};

const HOUR_MS = 60 * 60 * 1000;
const JOIN_CODE_LENGTH = 5;
const JOIN_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function toInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function hoursFromNow(hours: number) {
  return toInputValue(new Date(Date.now() + hours * HOUR_MS));
}

export function createEmptyTimer(): HackathonTimer {
  return {
    id: crypto.randomUUID(),
    joinCode: null,
    title: "",
    ownerName: "You",
    isOwner: true,
    start: hoursFromNow(0),
    finish: hoursFromNow(24),
    milestones: [],
  };
}

export function generateJoinCode(takenCodes: (string | null)[]) {
  let code = "";
  while (code.length < JOIN_CODE_LENGTH || takenCodes.includes(code)) {
    code = Array.from(
      { length: JOIN_CODE_LENGTH },
      () =>
        JOIN_CODE_ALPHABET[
          Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)
        ],
    ).join("");
  }
  return code;
}

export function isFinished(timer: HackathonTimer) {
  return new Date(timer.finish).getTime() <= Date.now();
}

export function createSeedTimers(): HackathonTimer[] {
  const sprintMilestones = [
    { id: "kickoff", title: "Kickoff call", time: hoursFromNow(-2) },
    { id: "lecture", title: "Lecture on architecture", time: hoursFromNow(1) },
    { id: "sync", title: "Sync on tasks", time: hoursFromNow(5) },
    { id: "freeze", title: "Feature freeze", time: hoursFromNow(18) },
    { id: "demo", title: "Demo rehearsal", time: hoursFromNow(26) },
  ];

  return [
    {
      id: "seed-release-sprint",
      joinCode: "KQZXP",
      title: "Release sprint",
      ownerName: "You",
      isOwner: true,
      start: hoursFromNow(-3),
      finish: hoursFromNow(30),
      milestones: sprintMilestones,
    },
    {
      id: "seed-innohack",
      joinCode: "MNBVC",
      title: "InnoHack 2026",
      ownerName: "Ivan Petrov",
      isOwner: false,
      start: hoursFromNow(-10),
      finish: hoursFromNow(14),
      milestones: [
        { id: "mentors", title: "Mentors call", time: hoursFromNow(-6) },
        { id: "checkpoint", title: "Checkpoint", time: hoursFromNow(4) },
        { id: "pitch", title: "Pitch", time: hoursFromNow(12) },
      ],
    },
    {
      id: "seed-old-demo-day",
      joinCode: null,
      title: "Demo day (private)",
      ownerName: "You",
      isOwner: true,
      start: hoursFromNow(-72),
      finish: hoursFromNow(-48),
      milestones: [{ id: "demo", title: "Demos", time: hoursFromNow(-50) }],
    },
  ];
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

// There is no backend yet, so joining by code creates a placeholder timer
export function createJoinedTimerPlaceholder(joinCode: string): HackathonTimer {
  return {
    id: crypto.randomUUID(),
    joinCode,
    title: `Timer ${joinCode}`,
    ownerName: "Another user",
    isOwner: false,
    start: hoursFromNow(-1),
    finish: hoursFromNow(12),
    milestones: [
      { id: "sync", title: "Sync", time: hoursFromNow(3) },
      { id: "demo", title: "Demo", time: hoursFromNow(10) },
    ],
  };
}
