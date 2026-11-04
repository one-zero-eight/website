import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import { resolveTimetableInstructor } from "./instructorDetails.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import type { Meeting } from "./timetableViewerModel.ts";

export type PersonalTimetableGroup = {
  groupId: string;
  label: string;
  sectionCode: string;
  programCode: string;
};

export type PersonalMeetingRole = "studying" | "teaching";

export type PersonalMeetingEntry = {
  meeting: Meeting;
  roles: PersonalMeetingRole[];
  /** Own student groups that attend this meeting (labels). */
  ownGroupLabels: string[];
};

/** Follow timetable hierarchy order, not the order returned by personal lookup. */
export function personalTimetableGroups(
  config: TimetableViewConfig,
  groupIds: readonly string[],
): PersonalTimetableGroup[] {
  const own = new Set(groupIds);
  const seen = new Set<string>();
  const labels = new Map(
    (config.students_groups ?? []).map((group) => [
      group.code,
      group.name || group.code,
    ]),
  );
  const groups: PersonalTimetableGroup[] = [];
  for (const section of config.term.sections ?? []) {
    for (const program of section.programs) {
      for (const track of normalizeTracksFromSectionProgram(program)) {
        for (const groupId of track.groups) {
          if (!own.has(groupId) || seen.has(groupId)) continue;
          seen.add(groupId);
          groups.push({
            groupId,
            label: labels.get(groupId) || groupId,
            sectionCode: section.code,
            programCode: program.code,
          });
        }
      }
    }
  }
  return groups;
}

/** Match the signed-in email (or other identity token) to a timetable instructor. */
export function resolvePersonalInstructorId(
  config: TimetableViewConfig,
  identityToken: string | null | undefined,
): string | undefined {
  if (!identityToken?.trim()) return undefined;
  return resolveTimetableInstructor(config.instructors ?? [], identityToken)
    ?.id;
}

function meetingInstructorTokens(meeting: Meeting): string[] {
  if (typeof meeting.instructors === "string") {
    return meeting.instructors ? [meeting.instructors] : [];
  }
  return (meeting.instructors ?? []).filter(Boolean);
}

function meetingTaughtByInstructor(
  meeting: Meeting,
  instructors: NonNullable<TimetableViewConfig["instructors"]>,
  instructorId: string,
): boolean {
  return meetingInstructorTokens(meeting).some((assignment) => {
    const resolved = resolveTimetableInstructor(instructors, assignment);
    if (resolved) return resolved.id === instructorId;
    return (
      assignment.trim().toLocaleLowerCase() === instructorId.toLocaleLowerCase()
    );
  });
}

/** Prefer this week, then the nearest available teaching week, skipping cancellations. */
export function nearestPersonalMeeting(
  meetings: readonly Meeting[],
  group: PersonalTimetableGroup,
  today: string,
): Meeting | undefined {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekday = (todayDate.getUTCDay() + 6) % 7;
  const weekStart = todayDate.getTime() - weekday * 86_400_000;
  const weekEnd = weekStart + 7 * 86_400_000;
  const distance = (meeting: Meeting) => {
    const time = new Date(`${meeting.date}T00:00:00Z`).getTime();
    if (time >= weekStart && time < weekEnd) return 0;
    return time < weekStart ? weekStart - time : time - weekEnd + 1;
  };
  return meetings
    .filter(
      (meeting) =>
        !meeting.cancelled &&
        meeting.section === group.sectionCode &&
        meeting.groups.includes(group.groupId),
    )
    .sort(
      (a, b) =>
        distance(a) - distance(b) ||
        a.date.localeCompare(b.date) ||
        a.start.localeCompare(b.start),
    )[0];
}

export function shouldAutoNavigatePersonalGroups({
  ready,
  handled,
  userNavigated,
  focusMeetingId,
  groups,
}: {
  ready: boolean;
  handled: boolean;
  userNavigated: boolean;
  focusMeetingId?: string;
  groups: readonly PersonalTimetableGroup[];
}): boolean {
  return (
    ready && !handled && !userNavigated && !focusMeetingId && groups.length > 0
  );
}

export type PersonalMeetingsDay = {
  date: string;
  meetings: PersonalMeetingEntry[];
};

/** Personal meetings for one teaching week, grouped by calendar day. */
export function listPersonalMeetingsByDay(
  meetings: readonly Meeting[],
  groupIds: readonly string[],
  weekStart: string,
  options?: {
    groupLabelsById?: ReadonlyMap<string, string>;
    instructors?: TimetableViewConfig["instructors"];
    instructorId?: string;
  },
): PersonalMeetingsDay[] {
  const instructorId = options?.instructorId?.trim();
  if ((!groupIds.length && !instructorId) || !weekStart) return [];
  const own = new Set(groupIds);
  const instructors = options?.instructors ?? [];
  const groupLabelsById = options?.groupLabelsById;
  const weekStartMs = new Date(`${weekStart}T00:00:00Z`).getTime();
  if (Number.isNaN(weekStartMs)) return [];
  const weekEndMs = weekStartMs + 7 * 86_400_000;
  const byDate = new Map<string, PersonalMeetingEntry[]>();
  for (const meeting of meetings) {
    if (meeting.cancelled) continue;
    const time = new Date(`${meeting.date}T00:00:00Z`).getTime();
    if (time < weekStartMs || time >= weekEndMs) continue;
    const studyingGroups = meeting.groups.filter((groupId) => own.has(groupId));
    const studying = studyingGroups.length > 0;
    const teaching =
      !!instructorId &&
      meetingTaughtByInstructor(meeting, instructors, instructorId);
    if (!studying && !teaching) continue;
    const roles: PersonalMeetingRole[] = [];
    if (studying) roles.push("studying");
    if (teaching) roles.push("teaching");
    const entry: PersonalMeetingEntry = {
      meeting,
      roles,
      ownGroupLabels: studyingGroups.map(
        (groupId) => groupLabelsById?.get(groupId) || groupId,
      ),
    };
    const day = byDate.get(meeting.date);
    if (day) day.push(entry);
    else byDate.set(meeting.date, [entry]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMeetings]) => ({
      date,
      meetings: dayMeetings.sort(
        (a, b) =>
          a.meeting.start.localeCompare(b.meeting.start) ||
          a.meeting.instance_id.localeCompare(b.meeting.instance_id),
      ),
    }));
}
