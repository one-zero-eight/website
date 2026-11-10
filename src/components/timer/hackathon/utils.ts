import { timerTypes } from "@/api/timer";

export type Milestone = {
  id: string;
  title: string;
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  time: string;
};

export type HackathonTimer = {
  id: number;
  title: string;
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  start: string;
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  finish: string;
  milestones: Milestone[];
  /** Only the creator can edit, delete and invite */
  isCreator: boolean;
};

/** Editable part of a timer, the same for a new and an existing timer */
export type TimerDraft = Pick<
  HackathonTimer,
  "title" | "start" | "finish" | "milestones"
>;

const HOUR_MS = 60 * 60 * 1000;
const INVITATION_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function toInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function hoursFromNow(hours: number) {
  return toInputValue(new Date(Date.now() + hours * HOUR_MS));
}

export function createEmptyDraft(): TimerDraft {
  return {
    title: "",
    start: hoursFromNow(0),
    finish: hoursFromNow(24),
    milestones: [],
  };
}

export function toDraft(timer: HackathonTimer): TimerDraft {
  return {
    title: timer.title,
    start: timer.start,
    finish: timer.finish,
    milestones: timer.milestones,
  };
}

/** Finds the invitation UUID in a pasted invitation link or in the bare UUID */
export function findInvitationUuid(text: string) {
  return text.match(INVITATION_UUID_PATTERN)?.[0] ?? null;
}

export function createInvitationLink(invitationUuid: string) {
  return `${window.location.origin}/timer/join/${invitationUuid}`;
}

export function isFinishAfterStart(draft: TimerDraft) {
  return new Date(draft.finish).getTime() > new Date(draft.start).getTime();
}

export function isDraftValid(draft: TimerDraft) {
  return (
    draft.title.trim() !== "" &&
    draft.milestones.every((milestone) => milestone.title.trim() !== "") &&
    isFinishAfterStart(draft)
  );
}

export function toHackathonTimer(
  timer: timerTypes.SchemaViewTimer,
  userId: string,
): HackathonTimer {
  const me = timer.participants.find(
    (participant) => participant.user_id === userId,
  );
  return {
    id: timer.id,
    title: timer.title,
    start: toInputValue(new Date(timer.start_time)),
    finish: toInputValue(new Date(timer.end_time)),
    milestones: timer.checkpoints.map((checkpoint, index) => ({
      id: String(index),
      title: checkpoint.title,
      time: toInputValue(new Date(checkpoint.time)),
    })),
    isCreator: me?.user_type === "creator",
  };
}

export function toTimerBody(draft: TimerDraft): timerTypes.SchemaUpdateTimer {
  return {
    title: draft.title.trim(),
    start_time: new Date(draft.start).toISOString(),
    end_time: new Date(draft.finish).toISOString(),
    checkpoints: draft.milestones.map((milestone) => ({
      title: milestone.title.trim(),
      time: new Date(milestone.time).toISOString(),
    })),
  };
}

export function isFinished(timer: HackathonTimer) {
  return new Date(timer.finish).getTime() <= Date.now();
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
